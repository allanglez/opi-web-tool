import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CyclesService } from '../cycles/cycles.service';
import {
  BulkCreateSchoolAssessmentDatesDto,
  CreateSchoolAssessmentDateDto,
} from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(
    private prisma: PrismaService,
    private cyclesService: CyclesService,
  ) {}

  async getCoordinatorSchools() {
    const cycle = await this.cyclesService.checkCycleApproval();

    const schools = await this.prisma.school.findMany({
      where: {
        classes: {
          some: {
            cycleId: cycle.id,
            isIncluded: true,
          },
        },
      },
      select: {
        id: true,
        schoolCode: true,
        name: true,
        classes: {
          where: {
            cycleId: cycle.id,
            isIncluded: true,
          },
          select: {
            id: true,
          },
        },
        schoolAssessmentDates: {
          where: {
            cycleId: cycle.id,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const assignments = await this.prisma.evaluatorAssignment.findMany({
      where: {
        cycleId: cycle.id,
      },
      select: {
        classId: true,
        class: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    const assignedClassIdsBySchool = new Map<number, Set<number>>();
    for (const assignment of assignments) {
      const existing = assignedClassIdsBySchool.get(assignment.class.schoolId) ?? new Set<number>();
      existing.add(assignment.classId);
      assignedClassIdsBySchool.set(assignment.class.schoolId, existing);
    }

    const schoolItems = schools.map((school) => {
      const includedClassCount = school.classes.length;
      const assignedClassCount = assignedClassIdsBySchool.get(school.id)?.size ?? 0;
      const unassignedClassCount = Math.max(includedClassCount - assignedClassCount, 0);

      return {
        id: school.id,
        schoolCode: school.schoolCode,
        name: school.name,
        includedClassCount,
        assignedClassCount,
        unassignedClassCount,
        scheduledDateCount: school.schoolAssessmentDates.length,
        isFullyAssigned: includedClassCount > 0 && assignedClassCount >= includedClassCount,
      };
    });

    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
      },
      schools: schoolItems,
      summary: {
        totalSchools: schoolItems.length,
        assignedSchools: schoolItems.filter((s) => s.isFullyAssigned).length,
        unassignedSchools: schoolItems.filter((s) => !s.isFullyAssigned).length,
      },
    };
  }

  async getSchoolDates(schoolId: number) {
    const cycle = await this.cyclesService.checkCycleApproval();
    const school = await this.ensureSchoolInCycle(schoolId, cycle.id);

    const dates = await this.prisma.schoolAssessmentDate.findMany({
      where: {
        cycleId: cycle.id,
        schoolId,
      },
      select: {
        id: true,
        assessmentDate: true,
        roundId: true,
        createdAt: true,
      },
      orderBy: {
        assessmentDate: 'asc',
      },
    });

    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
      },
      school,
      dates,
    };
  }

  async createSchoolDate(
    schoolId: number,
    dto: CreateSchoolAssessmentDateDto,
    userId: number,
  ) {
    const cycle = await this.cyclesService.checkCycleApproval();
    await this.ensureSchoolInCycle(schoolId, cycle.id);

    const assessmentDate = this.parseDateOnly(dto.assessmentDate);
    const roundId = dto.roundId ?? null;

    const existing = await this.prisma.schoolAssessmentDate.findFirst({
      where: {
        cycleId: cycle.id,
        schoolId,
        roundId,
        assessmentDate,
      },
    });

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Assessment date already exists for this school and cycle',
        error: 'CONFLICT_DUPLICATE',
      });
    }

    return this.prisma.schoolAssessmentDate.create({
      data: {
        cycleId: cycle.id,
        schoolId,
        roundId,
        assessmentDate,
        createdBy: userId,
      },
    });
  }

  async createSchoolDatesBulk(
    schoolId: number,
    dto: BulkCreateSchoolAssessmentDatesDto,
    userId: number,
  ) {
    const cycle = await this.cyclesService.checkCycleApproval();
    await this.ensureSchoolInCycle(schoolId, cycle.id);

    const roundId = dto.roundId ?? null;

    const normalizedDates = [...new Set(dto.assessmentDates.map((date) => this.toDateKey(date)))];
    const parsedDates = normalizedDates.map((date) => this.parseDateOnly(date));

    const existingDates = await this.prisma.schoolAssessmentDate.findMany({
      where: {
        cycleId: cycle.id,
        schoolId,
        roundId,
        assessmentDate: {
          in: parsedDates,
        },
      },
      select: {
        assessmentDate: true,
      },
    });

    const existingDateSet = new Set(existingDates.map((row) => this.toDateKey(row.assessmentDate)));
    const rowsToCreate = parsedDates.filter((date) => !existingDateSet.has(this.toDateKey(date)));

    if (rowsToCreate.length > 0) {
      await this.prisma.schoolAssessmentDate.createMany({
        data: rowsToCreate.map((assessmentDate) => ({
          cycleId: cycle.id,
          schoolId,
          roundId,
          assessmentDate,
          createdBy: userId,
        })),
      });
    }

    return {
      recordsTotal: dto.assessmentDates.length,
      recordsProcessed: normalizedDates.length,
      recordsInserted: rowsToCreate.length,
      recordsSkipped: normalizedDates.length - rowsToCreate.length,
    };
  }

  async deleteSchoolDate(schoolId: number, dateId: number) {
    const cycle = await this.cyclesService.checkCycleApproval();
    await this.ensureSchoolInCycle(schoolId, cycle.id);

    const dateRecord = await this.prisma.schoolAssessmentDate.findUnique({
      where: {
        id: dateId,
      },
      select: {
        id: true,
        cycleId: true,
        schoolId: true,
      },
    });

    if (!dateRecord || dateRecord.schoolId !== schoolId || dateRecord.cycleId !== cycle.id) {
      throw new NotFoundException('Assessment date not found');
    }

    await this.prisma.schoolAssessmentDate.delete({
      where: {
        id: dateId,
      },
    });

    return {
      success: true,
      deletedId: dateId,
    };
  }

  private async ensureSchoolInCycle(schoolId: number, cycleId: number) {
    const school = await this.prisma.school.findFirst({
      where: {
        id: schoolId,
        classes: {
          some: {
            cycleId,
            isIncluded: true,
          },
        },
      },
      select: {
        id: true,
        schoolCode: true,
        name: true,
      },
    });

    if (!school) {
      throw new NotFoundException('School not found in active cycle');
    }

    return school;
  }

  private parseDateOnly(value: string) {
    const date = new Date(`${this.toDateKey(value)}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid assessment date');
    }

    return date;
  }

  private toDateKey(value: string | Date) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid assessment date');
    }

    return date.toISOString().slice(0, 10);
  }
}
