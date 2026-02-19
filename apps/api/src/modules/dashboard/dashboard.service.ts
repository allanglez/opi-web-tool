import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboardStats() {
    const activeCycle = await this.prisma.assessmentCycle.findFirst({
      where: { isActive: true },
    });

    if (!activeCycle) {
      return {
        systemOverview: {
          totalStudents: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overallProgress: 0,
        },
        schoolsCompletion: [],
        evaluatorWorkload: [],
        recentActivity: [],
      };
    }

    const cycleId = activeCycle.id;

    const [systemOverview, schoolsCompletion, evaluatorWorkload, recentActivity] =
      await Promise.all([
        this.getSystemOverview(cycleId),
        this.getSchoolsCompletion(cycleId),
        this.getEvaluatorWorkload(cycleId),
        this.getRecentActivity(cycleId),
      ]);

    return {
      systemOverview,
      schoolsCompletion,
      evaluatorWorkload,
      recentActivity,
    };
  }

  private async getSystemOverview(cycleId: number) {
    const totalStudents = await this.prisma.student.count({
      where: { cycleId, isActive: true },
    });

    const assessments = await this.prisma.assessment.groupBy({
      by: ['status'],
      where: { cycleId },
      _count: { id: true },
    });

    const statusMap = new Map(
      assessments.map((a) => [a.status, a._count.id]),
    );

    const completed = statusMap.get('COMPLETED') ?? 0;
    const inProgress = statusMap.get('IN_PROGRESS') ?? 0;
    const absent = statusMap.get('ABSENT') ?? 0;

    // Students with no assessment record = NOT_STARTED
    const studentsWithAssessment = completed + inProgress + absent +
      (statusMap.get('NOT_STARTED') ?? 0);
    const notStarted = totalStudents - studentsWithAssessment + (statusMap.get('NOT_STARTED') ?? 0);

    const overallProgress =
      totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;

    return {
      totalStudents,
      completed,
      inProgress,
      notStarted: Math.max(0, notStarted),
      overallProgress,
    };
  }

  private async getSchoolsCompletion(cycleId: number) {
    // Get all schools that have students in this cycle
    const schools = await this.prisma.school.findMany({
      where: {
        students: {
          some: { cycleId, isActive: true },
        },
      },
      include: {
        students: {
          where: { cycleId, isActive: true },
          select: {
            id: true,
            assessments: {
              where: { cycleId },
              select: { status: true },
            },
          },
        },
        classes: {
          where: { cycleId, isIncluded: true },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return schools.map((school) => {
      const totalStudents = school.students.length;
      const completedStudents = school.students.filter((s) =>
        s.assessments.some((a) => a.status === 'COMPLETED'),
      ).length;
      const completion =
        totalStudents > 0
          ? Math.round((completedStudents / totalStudents) * 100)
          : 0;

      // Determine school type from name heuristic
      const schoolType = school.schoolType ||
        (school.name.toLowerCase().includes('secondary') ? 'Secondary' : 'Elementary');

      return {
        name: school.name,
        stats: `${totalStudents} students | ${schoolType}`,
        completion,
      };
    }).sort((a, b) => b.completion - a.completion);
  }

  private async getEvaluatorWorkload(cycleId: number) {
    // Get evaluators who have assignments in this cycle
    const evaluators = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: { name: 'EVALUATOR' },
          },
        },
        evaluatorAssignmentsAs: {
          some: { cycleId },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const workload = await Promise.all(
      evaluators.map(async (evaluator) => {
        // Get all students assigned to this evaluator through class assignments
        const assignedClasses = await this.prisma.evaluatorAssignment.findMany({
          where: { cycleId, evaluatorId: evaluator.id },
          select: { classId: true },
        });

        const classIds = assignedClasses.map((a) => a.classId);

        // Count total students in assigned classes
        const totalStudents = await this.prisma.classStudent.count({
          where: {
            classId: { in: classIds },
            student: { cycleId, isActive: true },
          },
        });

        // Count completed assessments by this evaluator
        const completedAssessments = await this.prisma.assessment.count({
          where: {
            cycleId,
            evaluatorId: evaluator.id,
            status: 'COMPLETED',
          },
        });

        return {
          name: `${evaluator.firstName} ${evaluator.lastName}`.trim(),
          completed: completedAssessments,
          total: totalStudents,
        };
      }),
    );

    return workload;
  }

  private async getRecentActivity(cycleId: number) {
    // Get recently completed/scored assessments
    const recentAssessments = await this.prisma.assessment.findMany({
      where: {
        cycleId,
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
      },
      include: {
        student: {
          include: {
            school: {
              select: { name: true },
            },
          },
        },
        score: {
          select: {
            opiLevelId: true,
          },
        },
      },
      orderBy: { lastModifiedAt: 'desc' },
      take: 10,
    });

    return recentAssessments.map((assessment) => {
      const scoreText = assessment.score
        ? `Score: ${assessment.score.opiLevelId}`
        : 'Score: no-data';

      const date = assessment.completedAt || assessment.lastModifiedAt;
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

      return {
        id: assessment.id,
        name: `${assessment.student.firstName} ${assessment.student.lastName}`.trim(),
        school: assessment.student.school.name,
        timestamp: `${scoreText} | ${dateStr}`,
      };
    });
  }
}
