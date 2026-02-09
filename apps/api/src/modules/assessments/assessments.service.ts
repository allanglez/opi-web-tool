import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CyclesService } from '../cycles/cycles.service';
import { AuditService } from '../audit/audit.service';
import {
    StartAssessmentDto,
    UpdateAssessmentDto,
    CompleteAssessmentDto,
} from './dto/assessments.dto';

interface RawAssessment {
    id: number;
    cycle_id: number;
    student_id: number;
    evaluator_id: number | null;
    status: string;
}

@Injectable()
export class AssessmentsService {
    constructor(
        private prisma: PrismaService,
        private cyclesService: CyclesService,
        private auditService: AuditService,
    ) { }

    /**
     * Start an assessment - locks the student to the evaluator.
     * Uses SQL Server row-level locking (UPDLOCK, ROWLOCK) for concurrency safety.
     */
    async startAssessment(dto: StartAssessmentDto, evaluatorId: number) {
        // Check cycle is approved
        const cycle = await this.cyclesService.checkCycleApproval();
        if (cycle.id !== dto.cycleId) {
            throw new BadRequestException('Assessment must be for the active cycle');
        }

        // Check student exists
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
        });

        if (!student || student.cycleId !== dto.cycleId) {
            throw new NotFoundException('Student not found in this cycle');
        }

        // Use interactive transaction with row-level locking
        return this.prisma.$transaction(
            async (tx) => {
                // Check if assessment already exists using raw query with locking
                const existingAssessments = await tx.$queryRaw<RawAssessment[]>`
          SELECT id, cycle_id, student_id, evaluator_id, status 
          FROM assessments WITH (UPDLOCK, ROWLOCK)
          WHERE cycle_id = ${dto.cycleId} AND student_id = ${dto.studentId}
        `;

                if (existingAssessments.length > 0) {
                    const existing = existingAssessments[0];

                    // Check if locked by another evaluator
                    if (
                        existing.evaluator_id !== null &&
                        existing.evaluator_id !== evaluatorId &&
                        existing.status === 'IN_PROGRESS'
                    ) {
                        throw new ConflictException({
                            statusCode: 409,
                            message: 'Assessment is locked by another evaluator',
                            error: 'ASSESSMENT_LOCKED',
                            details: {
                                assessmentId: existing.id,
                                evaluatorId: existing.evaluator_id,
                            },
                        });
                    }

                    // Already started by this evaluator or completed
                    if (existing.status === 'COMPLETED') {
                        throw new ConflictException({
                            statusCode: 409,
                            message: 'Assessment is already completed',
                            error: 'ASSESSMENT_COMPLETED',
                        });
                    }

                    // Update existing assessment to lock to this evaluator
                    const updated = await tx.assessment.update({
                        where: { id: existing.id },
                        data: {
                            evaluatorId,
                            status: 'IN_PROGRESS',
                            startedAt: existing.evaluator_id === null ? new Date() : undefined,
                            lastModifiedAt: new Date(),
                        },
                        include: {
                            student: true,
                            evaluator: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                            score: {
                                include: {
                                    opiLevel: true,
                                },
                            },
                        },
                    });

                    // Audit log
                    await this.auditService.logAssessmentAction(
                        updated.id,
                        'ASSESSMENT_START',
                        evaluatorId,
                        'status',
                        existing.status,
                        'IN_PROGRESS',
                    );

                    return updated;
                }

                // Create new assessment
                const newAssessment = await tx.assessment.create({
                    data: {
                        cycleId: dto.cycleId,
                        studentId: dto.studentId,
                        evaluatorId,
                        status: 'IN_PROGRESS',
                        startedAt: new Date(),
                        lastModifiedAt: new Date(),
                    },
                    include: {
                        student: true,
                        evaluator: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                });

                // Audit log
                await this.auditService.logAssessmentAction(
                    newAssessment.id,
                    'ASSESSMENT_START',
                    evaluatorId,
                    'status',
                    'NOT_STARTED',
                    'IN_PROGRESS',
                );

                return newAssessment;
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                timeout: 10000,
            },
        );
    }

    /**
     * Get assessment by ID.
     */
    async getAssessment(id: number, userId: number) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
            include: {
                student: true,
                evaluator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                score: {
                    include: {
                        opiLevel: true,
                    },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        creator: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                criteriaResults: {
                    include: {
                        criteria: true,
                    },
                },
            },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        return {
            ...assessment,
            isLocked:
                assessment.evaluatorId !== null &&
                assessment.evaluatorId !== userId &&
                assessment.status === 'IN_PROGRESS',
        };
    }

    /**
     * Update assessment (save draft scores/notes).
     */
    async updateAssessment(
        id: number,
        dto: UpdateAssessmentDto,
        userId: number,
    ) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        // Check if user has permission (is the assigned evaluator or admin/coordinator)
        if (assessment.evaluatorId !== userId) {
            // For simplicity, we're checking if the user is the evaluator
            // In production, we'd also check ADMIN/COORDINATOR roles
            throw new ForbiddenException({
                statusCode: 403,
                message: 'You are not the assigned evaluator for this assessment',
                error: 'NOT_ASSIGNED',
            });
        }

        if (assessment.status === 'COMPLETED') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cannot update a completed assessment',
                error: 'ASSESSMENT_COMPLETED',
            });
        }

        // Update assessment
        const updated = await this.prisma.$transaction(async (tx) => {
            // Update score if provided
            if (dto.opiLevelId !== undefined) {
                await tx.assessmentScore.upsert({
                    where: { assessmentId: id },
                    create: {
                        assessmentId: id,
                        opiLevelId: dto.opiLevelId,
                        notes: dto.notes ?? null,
                        updatedBy: userId,
                    },
                    update: {
                        opiLevelId: dto.opiLevelId,
                        notes: dto.notes ?? null,
                        updatedBy: userId,
                        updatedAt: new Date(),
                    },
                });
            }

            // Update lastModifiedAt
            return tx.assessment.update({
                where: { id },
                data: {
                    lastModifiedAt: new Date(),
                },
                include: {
                    student: true,
                    evaluator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    score: {
                        include: {
                            opiLevel: true,
                        },
                    },
                },
            });
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            id,
            'ASSESSMENT_UPDATE',
            userId,
            'opiLevelId',
            undefined,
            dto.opiLevelId?.toString(),
        );

        return updated;
    }

    /**
     * Complete assessment.
     */
    async completeAssessment(
        id: number,
        dto: CompleteAssessmentDto,
        userId: number,
    ) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        if (assessment.evaluatorId !== userId) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'You are not the assigned evaluator for this assessment',
                error: 'NOT_ASSIGNED',
            });
        }

        if (assessment.status === 'COMPLETED') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Assessment is already completed',
                error: 'ASSESSMENT_COMPLETED',
            });
        }

        // Validate required fields
        if (dto.opiLevelId === undefined || dto.opiLevelId === null) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'OPI level is required to complete assessment',
                error: 'VALIDATION_ERROR',
            });
        }

        // Complete assessment
        const completed = await this.prisma.$transaction(async (tx) => {
            // Upsert score
            await tx.assessmentScore.upsert({
                where: { assessmentId: id },
                create: {
                    assessmentId: id,
                    opiLevelId: dto.opiLevelId,
                    notes: dto.notes ?? null,
                    updatedBy: userId,
                },
                update: {
                    opiLevelId: dto.opiLevelId,
                    notes: dto.notes ?? null,
                    updatedBy: userId,
                    updatedAt: new Date(),
                },
            });

            // Update assessment status
            return tx.assessment.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    lastModifiedAt: new Date(),
                },
                include: {
                    student: true,
                    evaluator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    score: {
                        include: {
                            opiLevel: true,
                        },
                    },
                },
            });
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            id,
            'ASSESSMENT_COMPLETE',
            userId,
            'status',
            assessment.status,
            'COMPLETED',
        );

        return completed;
    }

    /**
     * Reopen a completed assessment (ADMIN/COORDINATOR only).
     */
    async reopenAssessment(id: number, userId: number) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        if (assessment.status !== 'COMPLETED') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Only completed assessments can be reopened',
                error: 'NOT_COMPLETED',
            });
        }

        const reopened = await this.prisma.assessment.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                completedAt: null,
                lastModifiedAt: new Date(),
            },
            include: {
                student: true,
                evaluator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                score: {
                    include: {
                        opiLevel: true,
                    },
                },
            },
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            id,
            'ASSESSMENT_REOPEN',
            userId,
            'status',
            'COMPLETED',
            'IN_PROGRESS',
        );

        return reopened;
    }

    /**
     * Get OPI levels for dropdown.
     */
    async getOpiLevels() {
        return this.prisma.opiLevel.findMany({
            orderBy: { id: 'asc' },
        });
    }
}
