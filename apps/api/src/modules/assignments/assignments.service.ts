import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CyclesService } from '../cycles/cycles.service';
import { CreateAssignmentDto, QueryAssignmentsDto } from './dto/assignments.dto';

@Injectable()
export class AssignmentsService {
    constructor(
        private prisma: PrismaService,
        private cyclesService: CyclesService,
    ) { }

    async createAssignment(dto: CreateAssignmentDto, assignedByUserId: number) {
        // 1. Check cycle is approved
        const cycle = await this.cyclesService.checkCycleApproval();
        if (cycle.id !== dto.cycleId) {
            throw new BadRequestException('Assignment must be for the active cycle');
        }

        // 2. Check class exists and is included
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

        // 3. Check evaluator exists and has EVALUATOR role
        const evaluator = await this.prisma.user.findUnique({
            where: { id: dto.evaluatorId },
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

        const hasEvaluatorRole = evaluator.userRoles.some(
            (ur) => ur.role.name === 'EVALUATOR',
        );
        if (!hasEvaluatorRole) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'User does not have EVALUATOR role',
                error: 'NOT_EVALUATOR',
            });
        }

        // 4. Check for duplicate assignment
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

        // 5. Create assignment
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
}
