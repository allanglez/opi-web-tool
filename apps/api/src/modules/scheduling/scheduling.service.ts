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

  async getCoordinatorDashboard() {
    const cycle = await this.cyclesService.checkCycleApproval();

    // Get all schools with their classes, assignments, and dates
    const schools = await this.prisma.school.findMany({
      where: {
        classes: {
          some: { cycleId: cycle.id, isIncluded: true },
        },
      },
      select: {
        id: true,
        name: true,
        schoolType: true,
        classes: {
          where: { cycleId: cycle.id, isIncluded: true },
          select: {
            id: true,
            classStudents: {
              select: { studentId: true },
            },
          },
        },
        schoolAssessmentDates: {
          where: { cycleId: cycle.id },
          select: {
            assessmentDate: true,
          },
          orderBy: { assessmentDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get all assignments for this cycle
    const assignments = await this.prisma.evaluatorAssignment.findMany({
      where: { cycleId: cycle.id },
      select: {
        classId: true,
        evaluatorId: true,
        class: { select: { schoolId: true } },
      },
    });

    // Get evaluators with their details
    const evaluators = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: { some: { role: { name: 'EVALUATOR' } } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Build assignment maps
    const assignedClassIdsBySchool = new Map<number, Set<number>>();
    const evaluatorSchools = new Map<number, Set<number>>();
    const evaluatorStudents = new Map<number, Set<number>>();

    for (const a of assignments) {
      // School assignments
      const schoolSet = assignedClassIdsBySchool.get(a.class.schoolId) ?? new Set();
      schoolSet.add(a.classId);
      assignedClassIdsBySchool.set(a.class.schoolId, schoolSet);

      // Evaluator → schools
      const evSchools = evaluatorSchools.get(a.evaluatorId) ?? new Set();
      evSchools.add(a.class.schoolId);
      evaluatorSchools.set(a.evaluatorId, evSchools);
    }

    // Count students per evaluator from assigned classes
    for (const school of schools) {
      for (const cls of school.classes) {
        const classAssignments = assignments.filter((a) => a.classId === cls.id);
        for (const a of classAssignments) {
          const evStudents = evaluatorStudents.get(a.evaluatorId) ?? new Set();
          for (const cs of cls.classStudents) {
            evStudents.add(cs.studentId);
          }
          evaluatorStudents.set(a.evaluatorId, evStudents);
        }
      }
    }

    // Get completed assessments per evaluator
    const completedByEvaluator = await this.prisma.assessment.groupBy({
      by: ['evaluatorId'],
      where: { cycleId: cycle.id, status: 'COMPLETED' },
      _count: { id: true },
    });
    const completedMap = new Map(
      completedByEvaluator.map((c) => [c.evaluatorId, c._count.id]),
    );

    // Build school items
    const schoolItems = schools.map((school) => {
      const totalClasses = school.classes.length;
      const assignedClasses = assignedClassIdsBySchool.get(school.id)?.size ?? 0;
      const totalStudents = school.classes.reduce(
        (sum, cls) => sum + cls.classStudents.length,
        0,
      );
      const isFullyAssigned = totalClasses > 0 && assignedClasses >= totalClasses;
      const dates = school.schoolAssessmentDates.map((d) =>
        d.assessmentDate.toISOString().slice(0, 10),
      );

      return {
        id: school.id,
        name: school.name,
        schoolType: school.schoolType ?? (school.name.toLowerCase().includes('secondary') ? 'Secondary' : 'Elementary'),
        totalStudents,
        totalClasses,
        assignedClasses,
        isFullyAssigned,
        dates,
      };
    });

    const unassignedSchools = schoolItems.filter((s) => !s.isFullyAssigned);

    // Build evaluator status
    const evaluatorStatus = evaluators
      .filter((ev) => evaluatorSchools.has(ev.id))
      .map((ev) => {
        const schoolCount = evaluatorSchools.get(ev.id)?.size ?? 0;
        const studentCount = evaluatorStudents.get(ev.id)?.size ?? 0;
        const completed = completedMap.get(ev.id) ?? 0;
        const progress = studentCount > 0 ? Math.round((completed / studentCount) * 100) : 0;

        return {
          id: ev.id,
          name: `${ev.firstName} ${ev.lastName}`.trim(),
          schoolCount,
          studentCount,
          completedCount: completed,
          progress,
        };
      });

    // Build upcoming assessment dates
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingDates: Array<{
      schoolId: number;
      schoolName: string;
      evaluatorName: string;
      dates: string[];
    }> = [];

    for (const school of schoolItems) {
      const futureDates = school.dates.filter((d) => new Date(d) >= now);
      if (futureDates.length === 0) continue;

      // Find evaluators assigned to this school
      const schoolEvaluators = assignments
        .filter((a) => a.class.schoolId === school.id)
        .map((a) => a.evaluatorId);
      const uniqueEvaluatorIds = [...new Set(schoolEvaluators)];
      const evaluatorNames = uniqueEvaluatorIds
        .map((id) => evaluators.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => `${e!.firstName} ${e!.lastName}`.trim());

      upcomingDates.push({
        schoolId: school.id,
        schoolName: school.name,
        evaluatorName: evaluatorNames.length > 0 ? evaluatorNames.join(', ') : 'Not assigned',
        dates: futureDates,
      });
    }

    upcomingDates.sort((a, b) => {
      const dateA = a.dates[0] ?? '';
      const dateB = b.dates[0] ?? '';
      return dateA.localeCompare(dateB);
    });

    return {
      cycle: { id: cycle.id, name: cycle.name },
      stats: {
        totalSchools: schoolItems.length,
        assignedSchools: schoolItems.filter((s) => s.isFullyAssigned).length,
        unassignedSchools: unassignedSchools.length,
      },
      unassignedSchools,
      evaluatorStatus,
      upcomingDates,
    };
  }

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

  async getSchedulingOverview() {
    const cycle = await this.cyclesService.checkCycleApproval();

    const schools = await this.prisma.school.findMany({
      where: {
        classes: {
          some: { cycleId: cycle.id, isIncluded: true },
        },
      },
      select: {
        id: true,
        name: true,
        schoolType: true,
        classes: {
          where: { cycleId: cycle.id, isIncluded: true },
          select: {
            id: true,
            classStudents: {
              select: { studentId: true },
            },
          },
        },
        schoolAssessmentDates: {
          where: { cycleId: cycle.id },
          select: {
            id: true,
            assessmentDate: true,
          },
          orderBy: { assessmentDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get assignments to determine evaluator status per school
    const assignments = await this.prisma.evaluatorAssignment.findMany({
      where: { cycleId: cycle.id },
      select: {
        classId: true,
        class: { select: { schoolId: true } },
      },
    });

    const assignedClassIdsBySchool = new Map<number, Set<number>>();
    for (const a of assignments) {
      const set = assignedClassIdsBySchool.get(a.class.schoolId) ?? new Set();
      set.add(a.classId);
      assignedClassIdsBySchool.set(a.class.schoolId, set);
    }

    const schoolRows = schools.map((school) => {
      const totalClasses = school.classes.length;
      const assignedClasses = assignedClassIdsBySchool.get(school.id)?.size ?? 0;
      const totalStudents = school.classes.reduce(
        (sum, cls) => sum + cls.classStudents.length,
        0,
      );
      const hasEvaluator = assignedClasses > 0;
      const isFullyAssigned = totalClasses > 0 && assignedClasses >= totalClasses;
      const dates = school.schoolAssessmentDates.map((d) => ({
        id: d.id,
        date: d.assessmentDate.toISOString().slice(0, 10),
      }));
      const hasDates = dates.length > 0;

      let status: string;
      if (!hasEvaluator) {
        status = 'NO_EVALUATOR';
      } else if (!hasDates) {
        status = 'MISSING_DATES';
      } else {
        status = 'READY';
      }

      return {
        id: school.id,
        name: school.name,
        schoolType: school.schoolType ?? (school.name.toLowerCase().includes('secondary') ? 'Secondary' : 'Elementary'),
        totalClasses,
        totalStudents,
        assignedClasses,
        isFullyAssigned,
        status,
        dates,
      };
    });

    // Upcoming assessments (future dates)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingAssessments: Array<{
      date: string;
      schoolName: string;
      schoolType: string;
    }> = [];

    for (const school of schoolRows) {
      for (const d of school.dates) {
        if (new Date(d.date) >= now) {
          upcomingAssessments.push({
            date: d.date,
            schoolName: school.name,
            schoolType: school.schoolType,
          });
        }
      }
    }
    upcomingAssessments.sort((a, b) => a.date.localeCompare(b.date));

    // Stats
    const readySchools = schoolRows.filter((s) => s.status === 'READY').length;
    const missingDates = schoolRows.filter((s) => s.status === 'MISSING_DATES').length;
    const noEvaluator = schoolRows.filter((s) => s.status === 'NO_EVALUATOR').length;

    return {
      cycle: { id: cycle.id, name: cycle.name },
      stats: {
        totalSchools: schoolRows.length,
        readyForAssessment: readySchools,
        missingDates,
        noEvaluator,
      },
      upcomingAssessments,
      schools: schoolRows,
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
