import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CyclesService } from '../cycles/cycles.service';
import {
  BulkCreateAssignmentsDto,
  CreateAssignmentDto,
  QueryAssignmentsDto,
} from './dto/assignments.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private cyclesService: CyclesService,
  ) {}

  async createAssignment(dto: CreateAssignmentDto, assignedByUserId: number) {
    await this.assertActiveApprovedCycle(dto.cycleId);

    const classEntity = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    if (classEntity.cycleId !== dto.cycleId) {
      throw new BadRequestException('Class does not belong to the specified cycle');
    }

    if (!classEntity.isIncluded) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Cannot assign evaluator to an excluded class',
        error: 'CLASS_NOT_INCLUDED',
      });
    }

    await this.assertEvaluatorRole(dto.evaluatorId);

    const existing = await this.prisma.evaluatorAssignment.findUnique({
      where: {
        cycleId_classId_evaluatorId: {
          cycleId: dto.cycleId,
          classId: dto.classId,
          evaluatorId: dto.evaluatorId,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Assignment already exists',
        error: 'CONFLICT_DUPLICATE',
      });
    }

    return this.prisma.evaluatorAssignment.create({
      data: {
        cycleId: dto.cycleId,
        classId: dto.classId,
        evaluatorId: dto.evaluatorId,
        assignedBy: assignedByUserId,
      },
      include: {
        class: {
          include: {
            school: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async createBulkAssignments(dto: BulkCreateAssignmentsDto, assignedByUserId: number) {
    await this.assertActiveApprovedCycle(dto.cycleId);

    const uniquePayload = new Map<string, { classId: number; evaluatorId: number }>();

    for (const assignment of dto.assignments) {
      const key = `${assignment.classId}:${assignment.evaluatorId}`;
      if (!uniquePayload.has(key)) {
        uniquePayload.set(key, assignment);
      }
    }

    const assignments = Array.from(uniquePayload.values());
    const classIds = [...new Set(assignments.map((a) => a.classId))];
    const evaluatorIds = [...new Set(assignments.map((a) => a.evaluatorId))];

    const [classes, evaluators, existingAssignments] = await Promise.all([
      this.prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, cycleId: true, isIncluded: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: evaluatorIds } },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.evaluatorAssignment.findMany({
        where: {
          cycleId: dto.cycleId,
          classId: { in: classIds },
          evaluatorId: { in: evaluatorIds },
        },
        select: {
          classId: true,
          evaluatorId: true,
        },
      }),
    ]);

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const evaluatorMap = new Map(
      evaluators.map((e) => [
        e.id,
        {
          exists: true,
          hasEvaluatorRole: e.userRoles.some((ur) => ur.role.name === 'EVALUATOR'),
        },
      ]),
    );
    const existingKeySet = new Set(
      existingAssignments.map((a) => `${a.classId}:${a.evaluatorId}`),
    );

    const errors: Array<{ classId: number; evaluatorId: number; error: string }> = [];
    const rowsToCreate: Array<{
      cycleId: number;
      classId: number;
      evaluatorId: number;
      assignedBy: number;
    }> = [];
    let skippedDuplicates = 0;

    for (const assignment of assignments) {
      const classEntity = classMap.get(assignment.classId);
      if (!classEntity) {
        errors.push({
          classId: assignment.classId,
          evaluatorId: assignment.evaluatorId,
          error: 'CLASS_NOT_FOUND',
        });
        continue;
      }

      if (classEntity.cycleId !== dto.cycleId) {
        errors.push({
          classId: assignment.classId,
          evaluatorId: assignment.evaluatorId,
          error: 'CLASS_NOT_IN_CYCLE',
        });
        continue;
      }

      if (!classEntity.isIncluded) {
        errors.push({
          classId: assignment.classId,
          evaluatorId: assignment.evaluatorId,
          error: 'CLASS_NOT_INCLUDED',
        });
        continue;
      }

      const evaluator = evaluatorMap.get(assignment.evaluatorId);
      if (!evaluator?.exists) {
        errors.push({
          classId: assignment.classId,
          evaluatorId: assignment.evaluatorId,
          error: 'EVALUATOR_NOT_FOUND',
        });
        continue;
      }

      if (!evaluator.hasEvaluatorRole) {
        errors.push({
          classId: assignment.classId,
          evaluatorId: assignment.evaluatorId,
          error: 'NOT_EVALUATOR',
        });
        continue;
      }

      const pairKey = `${assignment.classId}:${assignment.evaluatorId}`;
      if (existingKeySet.has(pairKey)) {
        skippedDuplicates++;
        continue;
      }

      existingKeySet.add(pairKey);
      rowsToCreate.push({
        cycleId: dto.cycleId,
        classId: assignment.classId,
        evaluatorId: assignment.evaluatorId,
        assignedBy: assignedByUserId,
      });
    }

    if (rowsToCreate.length > 0) {
      await this.prisma.evaluatorAssignment.createMany({
        data: rowsToCreate,
      });
    }

    return {
      recordsTotal: dto.assignments.length,
      recordsProcessed: assignments.length,
      recordsCreated: rowsToCreate.length,
      recordsSkipped: skippedDuplicates,
      recordsFailed: errors.length,
      errors,
    };
  }

  async findAssignments(query: QueryAssignmentsDto) {
    const where: Record<string, unknown> = {};

    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }
    if (query.classId) {
      where.classId = query.classId;
    }
    if (query.evaluatorId) {
      where.evaluatorId = query.evaluatorId;
    }

    return this.prisma.evaluatorAssignment.findMany({
      where,
      include: {
        class: {
          include: {
            school: true,
            program: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { class: { school: { name: 'asc' } } },
        { class: { classCode: 'asc' } },
      ],
    });
  }

  async deleteAssignment(id: number, _deletedByUserId: number) {
    const assignment = await this.prisma.evaluatorAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.evaluatorAssignment.delete({
      where: { id },
    });

    return { success: true, deletedId: id };
  }

  async getEvaluatorWorkloadCounts(cycleId: number) {
    await this.assertActiveApprovedCycle(cycleId);

    const assignments = await this.prisma.evaluatorAssignment.groupBy({
      by: ['evaluatorId'],
      where: { cycleId },
      _count: {
        classId: true,
      },
    });

    return assignments.map((a) => ({
      evaluatorId: a.evaluatorId,
      classCount: a._count.classId,
    }));
  }

  async getEvaluators() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: 'EVALUATOR',
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getAssignableClasses(cycleId?: number) {
    const cycle = await this.cyclesService.checkCycleApproval();

    if (cycleId && cycle.id !== cycleId) {
      throw new BadRequestException('Classes can only be queried for the active approved cycle');
    }

    return this.prisma.class.findMany({
      where: {
        cycleId: cycle.id,
        isIncluded: true,
      },
      include: {
        school: {
          select: {
            id: true,
            schoolCode: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ school: { name: 'asc' } }, { classCode: 'asc' }],
    });
  }

  private async assertActiveApprovedCycle(cycleId: number) {
    const cycle = await this.cyclesService.checkCycleApproval();

    if (cycle.id !== cycleId) {
      throw new BadRequestException('Operation must target the active cycle');
    }

    return cycle;
  }

  private async assertEvaluatorRole(evaluatorId: number) {
    const evaluator = await this.prisma.user.findUnique({
      where: { id: evaluatorId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!evaluator) {
      throw new NotFoundException('Evaluator not found');
    }

    const hasEvaluatorRole = evaluator.userRoles.some((ur) => ur.role.name === 'EVALUATOR');
    if (!hasEvaluatorRole) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'User does not have EVALUATOR role',
        error: 'NOT_EVALUATOR',
      });
    }
  }
}
