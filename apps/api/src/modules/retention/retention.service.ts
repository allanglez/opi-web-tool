import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { createStorageAdapter } from '../audio/storage/storage.factory';
import { StorageAdapter } from '../audio/storage/storage.interface';
import { ReportsService } from '../reports/reports.service';

export interface RetentionConfig {
  cycleId: number;
  cycleName: string;
  retentionDays: number | null;
  isActive: boolean;
  endsOn: Date;
  dataExpiry: Date | null;
}

export interface ResetStatus {
  status: 'idle' | 'exporting' | 'purging' | 'completed' | 'failed';
  cycleId?: number;
  cycleName?: string;
  startedAt?: Date;
  completedAt?: Date;
  exportedRecords?: number;
  purgedAssessments?: number;
  purgedAudioFiles?: number;
  error?: string;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly storageAdapter: StorageAdapter;
  private resetStatus: ResetStatus = { status: 'idle' };

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {
    this.storageAdapter = createStorageAdapter();
  }

  /**
   * Get retention configuration for all cycles (or a specific one).
   */
  async getRetentionConfig(cycleId?: number): Promise<RetentionConfig[]> {
    const where: Record<string, unknown> = {};
    if (cycleId) {
      where.id = cycleId;
    }

    const cycles = await this.prisma.assessmentCycle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        retentionDays: true,
        isActive: true,
        endsOn: true,
      },
    });

    return cycles.map((cycle) => ({
      cycleId: cycle.id,
      cycleName: cycle.name,
      retentionDays: cycle.retentionDays,
      isActive: cycle.isActive,
      endsOn: cycle.endsOn,
      dataExpiry: cycle.retentionDays
        ? new Date(cycle.endsOn.getTime() + cycle.retentionDays * 24 * 60 * 60 * 1000)
        : null,
    }));
  }

  /**
   * Update retention days for a specific cycle.
   */
  async updateRetentionConfig(cycleId: number, retentionDays: number | null) {
    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    if (retentionDays !== null && retentionDays < 1) {
      throw new BadRequestException('Retention days must be at least 1');
    }

    return this.prisma.assessmentCycle.update({
      where: { id: cycleId },
      data: { retentionDays },
    });
  }

  /**
   * Scheduled job: runs daily at 2 AM to purge expired cycle data.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleScheduledPurge() {
    this.logger.log('Running scheduled retention purge check...');

    const cycles = await this.prisma.assessmentCycle.findMany({
      where: {
        retentionDays: { not: null },
        isActive: false,
      },
    });

    const now = new Date();

    for (const cycle of cycles) {
      if (!cycle.retentionDays) continue;

      const expiryDate = new Date(
        cycle.endsOn.getTime() + cycle.retentionDays * 24 * 60 * 60 * 1000,
      );

      if (now >= expiryDate) {
        this.logger.warn(`Cycle "${cycle.name}" (ID: ${cycle.id}) has expired. Purging data...`);
        try {
          await this.purgeCycleData(cycle.id);
          this.logger.log(`Successfully purged data for cycle "${cycle.name}" (ID: ${cycle.id})`);
        } catch (error) {
          this.logger.error(
            `Failed to purge data for cycle "${cycle.name}" (ID: ${cycle.id}): ${error}`,
          );
        }
      }
    }
  }

  /**
   * Purge all assessment data and audio files for a given cycle.
   */
  async purgeCycleData(cycleId: number): Promise<{ purgedAssessments: number; purgedAudioFiles: number }> {
    // 1. Get all audio recordings for this cycle's assessments
    const audioRecordings = await this.prisma.audioRecording.findMany({
      where: {
        assessment: { cycleId },
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    // 2. Delete audio files from storage
    let purgedAudioFiles = 0;
    for (const recording of audioRecordings) {
      try {
        await this.storageAdapter.deleteObject(recording.storageKey);
        purgedAudioFiles++;
      } catch (error) {
        this.logger.warn(`Failed to delete audio file ${recording.storageKey}: ${error}`);
      }
    }

    // 3. Delete database records in correct order (respecting FK constraints)
    const purgeResult = await this.prisma.$transaction(async (tx) => {
      // Delete audio recording DB records
      await tx.audioRecording.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Delete assessment audit logs
      await tx.assessmentAuditLog.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Delete assessment notes
      await tx.assessmentNote.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Delete assessment criteria results
      await tx.assessmentCriteriaResult.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Delete assessment scores
      await tx.assessmentScore.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Delete assessments
      const deletedAssessments = await tx.assessment.deleteMany({
        where: { cycleId },
      });

      // Delete class notes for classes in this cycle
      await tx.classNote.deleteMany({
        where: { class: { cycleId } },
      });

      // Delete evaluator assignments
      await tx.evaluatorAssignment.deleteMany({
        where: { cycleId },
      });

      // Delete school assessment dates
      await tx.schoolAssessmentDate.deleteMany({
        where: { cycleId },
      });

      // Delete class-student enrollments for this cycle
      await tx.classStudent.deleteMany({
        where: { class: { cycleId } },
      });

      // Delete students for this cycle
      await tx.student.deleteMany({
        where: { cycleId },
      });

      // Delete classes for this cycle
      await tx.class.deleteMany({
        where: { cycleId },
      });

      // Delete assessment rounds
      await tx.assessmentRound.deleteMany({
        where: { cycleId },
      });

      return { purgedAssessments: deletedAssessments.count };
    });

    return {
      purgedAssessments: purgeResult.purgedAssessments,
      purgedAudioFiles,
    };
  }

  /**
   * Annual reset: export data, then purge the cycle.
   * Runs asynchronously — caller polls GET /admin/reset/status.
   */
  async startReset(cycleId: number): Promise<ResetStatus> {
    if (this.resetStatus.status === 'exporting' || this.resetStatus.status === 'purging') {
      throw new BadRequestException('A reset operation is already in progress');
    }

    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    // Initialize status
    this.resetStatus = {
      status: 'exporting',
      cycleId: cycle.id,
      cycleName: cycle.name,
      startedAt: new Date(),
    };

    // Run async — don't await
    this.executeReset(cycleId).catch((error) => {
      this.logger.error(`Reset failed for cycle ${cycleId}: ${error}`);
      this.resetStatus = {
        ...this.resetStatus,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    });

    return this.resetStatus;
  }

  private async executeReset(cycleId: number) {
    try {
      // Phase 1: Export
      this.resetStatus.status = 'exporting';
      this.logger.log(`Reset: exporting data for cycle ${cycleId}...`);

      const exportData = await this.reportsService.getProgressReport({ cycleId });
      this.resetStatus.exportedRecords = exportData.length;

      // Store export as JSON file in storage
      const exportJson = JSON.stringify(exportData, null, 2);
      const exportKey = `exports/cycle-${cycleId}-reset-${Date.now()}.json`;
      await this.storageAdapter.putObject(
        exportKey,
        Buffer.from(exportJson, 'utf-8'),
        'application/json',
      );
      this.logger.log(`Reset: exported ${exportData.length} records to ${exportKey}`);

      // Phase 2: Purge
      this.resetStatus.status = 'purging';
      this.logger.log(`Reset: purging data for cycle ${cycleId}...`);

      const purgeResult = await this.purgeCycleData(cycleId);

      // Phase 3: Deactivate cycle
      await this.prisma.assessmentCycle.update({
        where: { id: cycleId },
        data: { isActive: false },
      });

      // Done
      this.resetStatus = {
        ...this.resetStatus,
        status: 'completed',
        completedAt: new Date(),
        purgedAssessments: purgeResult.purgedAssessments,
        purgedAudioFiles: purgeResult.purgedAudioFiles,
      };

      this.logger.log(
        `Reset completed for cycle ${cycleId}: ${purgeResult.purgedAssessments} assessments, ${purgeResult.purgedAudioFiles} audio files purged`,
      );
    } catch (error) {
      this.resetStatus = {
        ...this.resetStatus,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  /**
   * Get current reset job status.
   */
  getResetStatus(): ResetStatus {
    return { ...this.resetStatus };
  }
}
