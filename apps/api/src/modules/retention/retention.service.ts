import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { createStorageAdapter } from '../audio/storage/storage.factory';
import { StorageAdapter } from '../audio/storage/storage.interface';
// import { ReportsService } from '../reports/reports.service';

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
  purgedStudents?: number;
  purgedAudioFiles?: number;
  error?: string;
}

export interface PrePurgeSummary {
  cycleId: number;
  cycleName: string;
  students: number;
  assessments: number;
  assessmentsInProgress: number;
  assessmentsNotStarted: number;
  audioFiles: number;
  totalRecords: number;
  canPurge: boolean;
  blockReason?: string;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly storageAdapter: StorageAdapter;
  private resetStatus: ResetStatus = { status: 'idle' };

  constructor(
    private readonly prisma: PrismaService,
    // private readonly reportsService: ReportsService,
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
   * Audio files are deleted first — if any fail, the purge aborts before touching the DB.
   */
  async purgeCycleData(cycleId: number): Promise<{ purgedAssessments: number; purgedAudioFiles: number; purgedStudents: number }> {
    // 1. Delete ALL files from storage (catches orphans too)
    const allKeys = await this.storageAdapter.listObjects();
    let purgedAudioFiles = 0;

    for (const key of allKeys) {
      // Skip export files — those are intentional backups
      if (key.startsWith('exports/')) continue;

      await this.storageAdapter.deleteObject(key);
      purgedAudioFiles++;
    }

    this.logger.log(`Deleted ${purgedAudioFiles} files from storage`);

    // 2. Delete database records in correct order (respecting FK constraints)
    const purgeResult = await this.prisma.$transaction(async (tx) => {
      // Audio recording DB records
      await tx.audioRecording.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessment audit logs
      await tx.assessmentAuditLog.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessment notes
      await tx.assessmentNote.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessment criteria results
      await tx.assessmentCriteriaResult.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessment scores
      await tx.assessmentScore.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessment review flags (cascade from assessment, but explicit for clarity)
      await tx.assessmentReviewFlag.deleteMany({
        where: { assessment: { cycleId } },
      });

      // Assessments
      const deletedAssessments = await tx.assessment.deleteMany({
        where: { cycleId },
      });

      // Class submissions (must come after assessments, before classes)
      await tx.classSubmission.deleteMany({
        where: { class: { cycleId } },
      });

      // Class notes
      await tx.classNote.deleteMany({
        where: { class: { cycleId } },
      });

      // Evaluator assignments
      await tx.evaluatorAssignment.deleteMany({
        where: { cycleId },
      });

      // School assessment dates
      await tx.schoolAssessmentDate.deleteMany({
        where: { cycleId },
      });

      // Class-student enrollments
      await tx.classStudent.deleteMany({
        where: { class: { cycleId } },
      });

      // Students
      const deletedStudents = await tx.student.deleteMany({
        where: { cycleId },
      });

      // Classes
      await tx.class.deleteMany({
        where: { cycleId },
      });

      // Assessment rounds
      await tx.assessmentRound.deleteMany({
        where: { cycleId },
      });

      // Data warehouse staging data
      await tx.dataWarehouseStagingRecord.deleteMany({});
      await tx.dataWarehouseBatch.deleteMany({});

      return {
        purgedAssessments: deletedAssessments.count,
        purgedStudents: deletedStudents.count,
      };
    });

    return {
      purgedAssessments: purgeResult.purgedAssessments,
      purgedStudents: purgeResult.purgedStudents,
      purgedAudioFiles,
    };
  }

  /**
   * Get a pre-purge summary with counts and whether purge is allowed.
   */
  async getPrePurgeSummary(cycleId: number): Promise<PrePurgeSummary> {
    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    const [
      students,
      assessments,
      assessmentsInProgress,
      assessmentsNotStarted,
      audioFiles,
      classes,
      enrollments,
      evaluatorAssignments,
    ] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { cycleId } }),
      this.prisma.assessment.count({ where: { cycleId } }),
      this.prisma.assessment.count({ where: { cycleId, status: 'IN_PROGRESS' } }),
      this.prisma.assessment.count({ where: { cycleId, status: 'NOT_STARTED' } }),
      this.prisma.audioRecording.count({ where: { assessment: { cycleId } } }),
      this.prisma.class.count({ where: { cycleId } }),
      this.prisma.classStudent.count({ where: { class: { cycleId } } }),
      this.prisma.evaluatorAssignment.count({ where: { cycleId } }),
    ]);

    const totalRecords = students + assessments + audioFiles + classes + enrollments + evaluatorAssignments;
    const hasBlockingAssessments = assessmentsInProgress > 0;

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      students,
      assessments,
      assessmentsInProgress,
      assessmentsNotStarted,
      audioFiles,
      totalRecords,
      canPurge: !hasBlockingAssessments,
      blockReason: hasBlockingAssessments
        ? `${assessmentsInProgress} assessment(s) are still in progress. All assessments must be completed or submitted before reset.`
        : undefined,
    };
  }

  /**
   * Annual reset: purge the cycle.
   * Runs asynchronously — caller polls GET /admin/reset/status.
   */
  async startReset(cycleId: number, userId: number): Promise<ResetStatus> {
    if (this.resetStatus.status === 'exporting' || this.resetStatus.status === 'purging') {
      throw new BadRequestException('A reset operation is already in progress');
    }

    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    // Pre-purge validation
    const summary = await this.getPrePurgeSummary(cycleId);
    if (!summary.canPurge) {
      throw new BadRequestException(summary.blockReason);
    }

    // Initialize status
    this.resetStatus = {
      status: 'purging',
      cycleId: cycle.id,
      cycleName: cycle.name,
      startedAt: new Date(),
    };

    // Run async — don't await
    this.executeReset(cycleId, userId, cycle.name, cycle.year).catch((error) => {
      this.logger.error(`Reset failed for cycle ${cycleId}: ${error}`);
      this.resetStatus = {
        ...this.resetStatus,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    });

    return this.resetStatus;
  }

  private async executeReset(cycleId: number, userId: number, cycleName: string, cycleYear: number) {
    try {
      this.resetStatus.status = 'purging';
      this.logger.log(`Reset: purging data for cycle ${cycleId}...`);

      const purgeResult = await this.purgeCycleData(cycleId);

      // Deactivate cycle
      await this.prisma.assessmentCycle.update({
        where: { id: cycleId },
        data: { isActive: false },
      });

      // Write non-purgeable audit log
      await this.prisma.systemAuditLog.create({
        data: {
          action: 'CYCLE_RESET',
          cycleId,
          cycleName,
          cycleYear,
          performedBy: userId,
          purgedAssessments: purgeResult.purgedAssessments,
          purgedStudents: purgeResult.purgedStudents,
          purgedAudioFiles: purgeResult.purgedAudioFiles,
          details: JSON.stringify({
            completedAt: new Date().toISOString(),
          }),
        },
      });

      // Done
      this.resetStatus = {
        ...this.resetStatus,
        status: 'completed',
        completedAt: new Date(),
        purgedAssessments: purgeResult.purgedAssessments,
        purgedStudents: purgeResult.purgedStudents,
        purgedAudioFiles: purgeResult.purgedAudioFiles,
      };

      this.logger.log(
        `Reset completed for cycle ${cycleId}: ${purgeResult.purgedAssessments} assessments, ${purgeResult.purgedStudents} students, ${purgeResult.purgedAudioFiles} audio files purged`,
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
