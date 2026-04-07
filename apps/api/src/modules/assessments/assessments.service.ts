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
    ReEvaluateDto,
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

    private formatCriteriaDescriptions(
        criteria: Array<{ description: string }>,
    ): string {
        if (criteria.length === 0) {
            return 'none';
        }

        return criteria
            .map((item) => item.description.trim())
            .filter((description) => description.length > 0)
            .join(', ');
    }

    private normalizeCriteriaIds(criteriaIds?: number[]): number[] {
        if (!criteriaIds || criteriaIds.length === 0) {
            return [];
        }

        return [...new Set(criteriaIds.filter((id) => Number.isInteger(id) && id > 0))];
    }

    private async getValidatedCriteriaForLevel(
        tx: Prisma.TransactionClient,
        opiLevelId: number,
        criteriaIds?: number[],
    ) {
        const normalizedCriteriaIds = this.normalizeCriteriaIds(criteriaIds);

        if (normalizedCriteriaIds.length === 0) {
            return [];
        }

        const criteria = await tx.assessmentCriteria.findMany({
            where: {
                id: { in: normalizedCriteriaIds },
                opiLevelId,
                isActive: true,
            },
            select: {
                id: true,
                description: true,
            },
        });

        if (criteria.length !== normalizedCriteriaIds.length) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'One or more selected criteria are invalid for the selected OPI level',
                error: 'VALIDATION_ERROR',
            });
        }

        return criteria;
    }

    /**
     * Start an assessment - locks student to evaluator.
     * Uses SQL Server row-level locking (UPDLOCK, ROWLOCK) for concurrency safety.
     * Enforces ownership - evaluators can only start assessments for assigned classes.
     */
    async startAssessment(dto: StartAssessmentDto, evaluatorId: number, userRoles?: string[]) {
        // Check cycle is approved
        const cycle = await this.cyclesService.checkCycleApproval();
        if (cycle.id !== dto.cycleId) {
            throw new BadRequestException('Assessment must be for active cycle');
        }

        // Check student exists and get class info
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
            include: {
                classStudents: {
                    include: {
                        class: true,
                    },
                },
            },
        });

        if (!student || student.cycleId !== dto.cycleId) {
            throw new NotFoundException('Student not found in this cycle');
        }

        // Get the student's class
        const classStudent = student.classStudents[0];
        if (!classStudent) {
            throw new BadRequestException('Student is not enrolled in any class');
        }

        const studentClass = classStudent.class;

        // Admin and Coordinator can start assessments without being assigned
        const isPrivileged = userRoles?.some(r => r === 'ADMIN' || r === 'COORDINATOR');

        if (!isPrivileged) {
            // Check if evaluator is assigned to this class
            const assignment = await this.prisma.evaluatorAssignment.findFirst({
                where: {
                    evaluatorId,
                    classId: studentClass.id,
                    cycleId: dto.cycleId,
                },
            });

            if (!assignment) {
                throw new ForbiddenException({
                    statusCode: 403,
                    message: 'You are not assigned to this class',
                    error: 'NOT_ASSIGNED_TO_CLASS',
                });
            }
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
                        tx,
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
                    tx,
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
                student: {
                    include: {
                        school: true,
                        classStudents: {
                            include: {
                                class: {
                                    include: {
                                        school: true,
                                        program: true,
                                        teacher: true,
                                    },
                                },
                            },
                        },
                    },
                },
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
                        updater: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
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

        // Extract class context from student's class enrollment
        const classStudent = assessment.student.classStudents?.[0];
        const classContext = classStudent ? {
            classId: classStudent.class.id,
            classCode: classStudent.class.classCode,
            grade: classStudent.class.grade,
            schoolName: classStudent.class.school?.name || assessment.student.school?.name || null,
            programName: classStudent.class.program?.name || null,
            teacherName: classStudent.class.teacher?.name || null,
        } : null;

        return {
            ...assessment,
            classContext,
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
        userRoles?: string[],
    ) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
            include: {
                score: true,
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

        // Check if user has permission (is the assigned evaluator or admin/coordinator)
        const isPrivileged = userRoles?.some(r => r === 'ADMIN' || r === 'COORDINATOR');
        if (assessment.evaluatorId !== userId && !isPrivileged) {
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

        const targetOpiLevelId = dto.opiLevelId ?? assessment.score?.opiLevelId;
        const shouldUpdateScore =
            dto.opiLevelId !== undefined || dto.notes !== undefined;

        if ((shouldUpdateScore || dto.criteriaIds !== undefined) && !targetOpiLevelId) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Select an OPI level before saving notes or criteria',
                error: 'VALIDATION_ERROR',
            });
        }

        // Update assessment
        const updated = await this.prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
            if (shouldUpdateScore && targetOpiLevelId) {
                await tx.assessmentScore.upsert({
                    where: { assessmentId: id },
                    create: {
                        assessmentId: id,
                        opiLevelId: targetOpiLevelId,
                        notes: dto.notes ?? assessment.score?.notes ?? null,
                        updatedBy: userId,
                    },
                    update: {
                        opiLevelId: targetOpiLevelId,
                        notes: dto.notes ?? assessment.score?.notes ?? null,
                        updatedBy: userId,
                        updatedAt: new Date(),
                    },
                });
            }

            if (dto.criteriaIds !== undefined && targetOpiLevelId) {
                const selectedCriteria = await this.getValidatedCriteriaForLevel(
                    tx,
                    targetOpiLevelId,
                    dto.criteriaIds,
                );

                await tx.assessmentCriteriaResult.deleteMany({
                    where: { assessmentId: id },
                });

                if (selectedCriteria.length > 0) {
                    await tx.assessmentCriteriaResult.createMany({
                        data: selectedCriteria.map((criteria) => ({
                            assessmentId: id,
                            criteriaId: criteria.id,
                            met: true,
                        })),
                    });
                }
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
                    criteriaResults: {
                        include: {
                            criteria: true,
                        },
                    },
                },
            });
        });

        if (dto.opiLevelId !== undefined) {
            await this.auditService.logAssessmentAction(
                id,
                'ASSESSMENT_UPDATE',
                userId,
                'opiLevelId',
                assessment.score?.opiLevelId?.toString(),
                dto.opiLevelId.toString(),
            );
        }

        if (dto.criteriaIds !== undefined) {
            const previousCriteriaDescriptions = this.formatCriteriaDescriptions(
                assessment.criteriaResults
                    .filter((result) => result.met)
                    .map((result) => ({ description: result.criteria.description })),
            );
            const nextCriteriaDescriptions = this.formatCriteriaDescriptions(
                updated.criteriaResults
                    .filter((result) => result.met)
                    .map((result) => ({ description: result.criteria.description })),
            );

            await this.auditService.logAssessmentAction(
                id,
                'ASSESSMENT_UPDATE',
                userId,
                'criteria_ids',
                previousCriteriaDescriptions,
                nextCriteriaDescriptions,
            );
        }

        return updated;
    }

    /**
     * Complete assessment.
     */
    async completeAssessment(
        id: number,
        dto: CompleteAssessmentDto,
        userId: number,
        userRoles?: string[],
    ) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        const isPrivilegedComplete = userRoles?.some(r => r === 'ADMIN' || r === 'COORDINATOR');
        if (assessment.evaluatorId !== userId && !isPrivilegedComplete) {
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

        // Check if audio recording is required for completion
        const hasAudio = await this.prisma.audioRecording.findFirst({
            where: { assessmentId: id },
        });

        if (!hasAudio) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Audio recording is required to complete an assessment',
                error: 'AUDIO_REQUIRED',
            });
        }

        // Complete assessment
        const completed = await this.prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const selectedCriteria = await this.getValidatedCriteriaForLevel(
                    tx,
                    dto.opiLevelId,
                    dto.criteriaIds,
                );

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

                await tx.assessmentCriteriaResult.deleteMany({
                    where: { assessmentId: id },
                });

                if (selectedCriteria.length > 0) {
                    await tx.assessmentCriteriaResult.createMany({
                        data: selectedCriteria.map((criteria) => ({
                            assessmentId: id,
                            criteriaId: criteria.id,
                            met: true,
                        })),
                    });
                }

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
                        criteriaResults: {
                            include: {
                                criteria: true,
                            },
                        },
                    },
                });
            },
        );

        // Audit log
        await this.auditService.logAssessmentAction(
            id,
            'ASSESSMENT_COMPLETE',
            userId,
            'status',
            assessment.status,
            'COMPLETED',
        );

        if (dto.criteriaIds !== undefined) {
            const selectedCriteriaDescriptions = this.formatCriteriaDescriptions(
                completed.criteriaResults
                    .filter((result) => result.met)
                    .map((result) => ({ description: result.criteria.description })),
            );
            await this.auditService.logAssessmentAction(
                id,
                'ASSESSMENT_COMPLETE',
                userId,
                'criteria_ids',
                'none',
                selectedCriteriaDescriptions,
            );
        }

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
     * Mark student as absent.
     */
    async markAbsent(id: number, userId: number, userRoles?: string[]) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        const isPrivilegedAbsent = userRoles?.some(r => r === 'ADMIN' || r === 'COORDINATOR');
        if (assessment.evaluatorId !== userId && !isPrivilegedAbsent) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'You are not assigned evaluator for this assessment',
                error: 'NOT_ASSIGNED',
            });
        }

        if (assessment.status === 'COMPLETED') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cannot mark a completed assessment as absent',
                error: 'ASSESSMENT_COMPLETED',
            });
        }

        // Mark as absent - create/update assessment with ABSENT status
        const updated = await this.prisma.$transaction(async (tx) => {
            return tx.assessment.update({
                where: { id },
                data: {
                    status: 'ABSENT',
                    evaluatorId: userId,
                    startedAt: assessment.startedAt || new Date(),
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
                },
            });
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            id,
            'ASSESSMENT_MARK_ABSENT',
            userId,
            'status',
            assessment.status,
            'ABSENT',
        );

        return updated;
    }

    /**
     * Reset an absent assessment back to in-progress and reassign to the requesting user.
     */
    async resetAbsent(id: number, userId: number) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        if (assessment.status !== 'ABSENT') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Only absent assessments can be reset',
                error: 'NOT_ABSENT',
            });
        }

        const updated = await this.prisma.assessment.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                evaluatorId: userId,
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
            'ASSESSMENT_RESET_ABSENT',
            userId,
            'status',
            'ABSENT',
            'IN_PROGRESS',
        );

        return updated;
    }

    /**
     * Get OPI levels for dropdown.
     */
    async getOpiLevels() {
        return this.prisma.opiLevel.findMany({
            orderBy: { id: 'asc' },
            include: {
                criteria: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        opiLevelId: true,
                        description: true,
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });
    }

    /**
     * Submit a class assessment - locks evaluator edits after submission
     */
    async submitClassAssessment(classId: number, submitData: { submittedBy: number; notes?: string }) {
        // Get all assessments for this class
        const assessments = await this.prisma.assessment.findMany({
            where: {
                student: {
                    classStudents: {
                        some: { classId },
                    },
                },
            },
            include: {
                student: true,
            },
        });

        // Check if all assessments are complete
        const incompleteAssessments = assessments.filter(a => 
            a.status !== 'COMPLETED' && a.status !== 'ABSENT'
        );

        if (incompleteAssessments.length > 0) {
            throw new BadRequestException('Cannot submit class with incomplete assessments');
        }

        // Update all assessments to mark as submitted
        const updated = await this.prisma.$transaction(async (tx) => {
            // Mark all assessments as submitted
            await tx.assessment.updateMany({
                where: {
                    id: { in: assessments.map(a => a.id) },
                },
                data: {
                    submittedAt: new Date(),
                    lastModifiedAt: new Date(),
                },
            });

            // Create class submission record (if we had the table)
            // TODO: Implement class_submissions table in future milestone

            return assessments;
        });

        // Audit log per assessment (assessment_audit_log has FK to assessment_id)
        await this.auditService.logMultipleActions(
            updated.map((assessment) => ({
                assessmentId: assessment.id,
                action: 'CLASS_SUBMITTED',
                userId: submitData.submittedBy,
                fieldName: 'status',
                oldValue: 'pending',
                newValue: 'submitted',
            })),
        );

        return updated;
    }

    /**
     * Lock assessment edits after submission
     */
    async lockAssessmentEdits(assessmentId: number, userId: number) {
        const updated = await this.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                submittedAt: new Date(),
                lastModifiedAt: new Date(),
            },
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            assessmentId,
            'ASSESSMENT_LOCKED',
            userId,
            'assessment',
            'submitted',
            'submitted',
        );

        return updated;
    }

    /**
     * Validate submission requirements for an assessment
     */
    async validateSubmissionRequirements(assessmentId: number) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                audioRecordings: true,
                score: true,
            },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        const requirements: string[] = [];

        // Check if assessment is complete
        if (assessment.status !== 'COMPLETED' && assessment.status !== 'ABSENT') {
            requirements.push('Assessment must be completed');
        }

        // Check if audio is required and present
        if (assessment.status !== 'ABSENT') {
            const hasAudio = assessment.audioRecordings && assessment.audioRecordings.length > 0;
            if (!hasAudio) {
                requirements.push('Audio recording is required');
            }
        }

        // Check if score is assigned
        if (!assessment.score) {
            requirements.push('OPI level must be assigned');
        }

        return {
            canSubmit: requirements.length === 0,
            requirements,
        };
    }

    /**
     * Flag assessment for review
     */
    async flagForReview(assessmentId: number, _reason: string, userId: number) {
        const updated = await this.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                needsReview: true,
                lastModifiedAt: new Date(),
            },
        });

        // Audit log
        await this.auditService.logAssessmentAction(
            assessmentId,
            'ASSESSMENT_FLAGGED_FOR_REVIEW',
            userId,
            'needs_review',
            'false',
            'true',
        );

        return updated;
    }

    /**
     * Re-evaluate a completed assessment (COORDINATOR/ADMIN only).
     * Updates the score and creates a full audit trail with old/new values.
     */
    async reEvaluateAssessment(
        id: number,
        dto: ReEvaluateDto,
        userId: number,
    ) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id },
            include: {
                score: {
                    include: { opiLevel: true },
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

        if (assessment.status !== 'COMPLETED') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Only completed assessments can be re-evaluated',
                error: 'NOT_COMPLETED',
            });
        }

        // Capture old values for audit trail
        const oldOpiLevelId = assessment.score?.opiLevelId;
        const oldNotes = assessment.score?.notes;
        const oldOpiDescription = assessment.score?.opiLevel?.description;

        // Fetch new OPI level description
        const newOpiLevel = await this.prisma.opiLevel.findUnique({
            where: { id: dto.opiLevelId },
            include: {
                criteria: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        description: true,
                    },
                },
            },
        });

        if (!newOpiLevel) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Invalid OPI level',
                error: 'INVALID_OPI_LEVEL',
            });
        }

        let selectedCriteria: Array<{ id: number; description: string }> = [];

        // Update score in transaction
        const updated = await this.prisma.$transaction(async (tx) => {
            // Upsert score with new value
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

            if (dto.criteriaIds !== undefined) {
                selectedCriteria = await this.getValidatedCriteriaForLevel(
                    tx,
                    dto.opiLevelId,
                    dto.criteriaIds,
                );

                await tx.assessmentCriteriaResult.deleteMany({
                    where: { assessmentId: id },
                });

                if (selectedCriteria.length > 0) {
                    await tx.assessmentCriteriaResult.createMany({
                        data: selectedCriteria.map((criteria) => ({
                            assessmentId: id,
                            criteriaId: criteria.id,
                            met: true,
                        })),
                    });
                }
            }

            // Clear needs_review flag if set
            return tx.assessment.update({
                where: { id },
                data: {
                    needsReview: false,
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
                            updater: {
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
            },
        );

        // Create audit trail entries
        type AuditEntry = {
            assessmentId: number;
            action: import('../audit/audit.service').AuditAction;
            userId: number;
            fieldName?: string;
            oldValue?: string;
            newValue?: string;
        };

        const auditEntries: AuditEntry[] = [
            {
                assessmentId: id,
                action: 'ASSESSMENT_RE_EVALUATE',
                userId,
                fieldName: 'reason',
                oldValue: undefined,
                newValue: dto.reason,
            },
        ];

        // Log score change if it actually changed
        if (oldOpiLevelId !== dto.opiLevelId) {
            auditEntries.push({
                assessmentId: id,
                action: 'SCORE_CHANGE',
                userId,
                fieldName: 'opiLevelId',
                oldValue: oldOpiDescription ?? oldOpiLevelId?.toString(),
                newValue: newOpiLevel.description,
            });
        }

        // Log notes change if applicable
        if (dto.notes !== undefined && dto.notes !== oldNotes) {
            auditEntries.push({
                assessmentId: id,
                action: 'ASSESSMENT_RE_EVALUATE',
                userId,
                fieldName: 'notes',
                oldValue: oldNotes ?? undefined,
                newValue: dto.notes,
            });
        }

        if (dto.criteriaIds !== undefined) {
            const oldCriteriaIds = assessment.criteriaResults
                .filter((result) => result.met)
                .map((result) => result.criteriaId)
                .sort((a, b) => a - b);

            const newCriteriaIds = selectedCriteria
                .map((criteria) => criteria.id)
                .sort((a, b) => a - b);

            if (oldCriteriaIds.join(',') !== newCriteriaIds.join(',')) {
                const oldCriteriaDescriptions = this.formatCriteriaDescriptions(
                    assessment.criteriaResults
                        .filter((result) => result.met)
                        .map((result) => ({ description: result.criteria.description })),
                );
                const newCriteriaDescriptions = this.formatCriteriaDescriptions(selectedCriteria);

                auditEntries.push({
                    assessmentId: id,
                    action: 'ASSESSMENT_RE_EVALUATE',
                    userId,
                    fieldName: 'criteria_ids',
                    oldValue: oldCriteriaDescriptions,
                    newValue: newCriteriaDescriptions,
                });
            }
        }

        // If needs_review was cleared
        if (assessment.needsReview) {
            auditEntries.push({
                assessmentId: id,
                action: 'REVIEW_RESOLVED',
                userId,
                fieldName: 'needs_review',
                oldValue: 'true',
                newValue: 'false',
            });
        }

        await this.auditService.logMultipleActions(auditEntries);

        return updated;
    }
}
