import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditAction =
    | 'ASSIGNMENT_CREATE'
    | 'ASSIGNMENT_DELETE'
    | 'ASSESSMENT_START'
    | 'ASSESSMENT_COMPLETE'
    | 'ASSESSMENT_REOPEN'
    | 'ASSESSMENT_UPDATE'
    | 'ASSESSMENT_MARK_ABSENT'
    | 'ASSESSMENT_AUDIO_UPLOADED'
    | 'CLASS_SUBMITTED'
    | 'ASSESSMENT_LOCKED'
    | 'ASSESSMENT_FLAGGED_FOR_REVIEW'
    | 'ASSESSMENT_RE_EVALUATE'
    | 'SCORE_CHANGE'
    | 'REVIEW_RESOLVED';

export type SystemAction =
    | 'CYCLE_RESET'
    | 'SCHEDULE_DATE_CREATE'
    | 'SCHEDULE_DATE_BULK_CREATE'
    | 'SCHEDULE_DATE_DELETE'
    | 'EVALUATOR_ASSIGN'
    | 'EVALUATOR_BULK_ASSIGN'
    | 'EVALUATOR_UNASSIGN'
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'USER_ROLE_CHANGE'
    | 'USER_ACTIVATE'
    | 'USER_DEACTIVATE';

export type ManualEditAction =
    | 'STUDENT_EDIT'
    | 'STUDENT_SCHOOL_REASSIGNMENT'
    | 'STUDENT_CLASS_ENROLLMENT_ADD'
    | 'STUDENT_CLASS_ENROLLMENT_REMOVE'
    | 'CLASS_EDIT';

export type ManualEditEntityType = 'STUDENT' | 'CLASS';

export interface AuditLogFilter {
    assessmentId?: number;
    action?: AuditAction | AuditAction[];
    changedBy?: number;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    /**
     * Log an action to the assessment audit log.
     */
    async logAssessmentAction(
        assessmentId: number,
        action: AuditAction,
        userId: number,
        fieldName?: string,
        oldValue?: string,
        newValue?: string,
        client?: Prisma.TransactionClient,
    ) {
        const prismaClient = client ?? this.prisma;

        return prismaClient.assessmentAuditLog.create({
            data: {
                assessmentId,
                action,
                fieldName: fieldName ?? null,
                oldValue: oldValue ?? null,
                newValue: newValue ?? null,
                changedBy: userId,
            },
        });
    }

    /**
     * Log multiple audit entries in a single transaction (e.g. re-evaluation).
     */
    async logMultipleActions(
        entries: Array<{
            assessmentId: number;
            action: AuditAction;
            userId: number;
            fieldName?: string;
            oldValue?: string;
            newValue?: string;
        }>,
    ) {
        return this.prisma.$transaction(
            entries.map((entry) =>
                this.prisma.assessmentAuditLog.create({
                    data: {
                        assessmentId: entry.assessmentId,
                        action: entry.action,
                        fieldName: entry.fieldName ?? null,
                        oldValue: entry.oldValue ?? null,
                        newValue: entry.newValue ?? null,
                        changedBy: entry.userId,
                    },
                }),
            ),
        );
    }

    /**
     * Get audit logs for an assessment (timeline view).
     */
    async getAssessmentAuditLogs(assessmentId: number) {
        return this.prisma.assessmentAuditLog.findMany({
            where: { assessmentId },
            include: {
                changer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { changedAt: 'desc' },
        });
    }

    /**
     * Get paginated and filtered audit logs (admin view).
     */
    async getFilteredAuditLogs(filter: AuditLogFilter) {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 25;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (filter.assessmentId) {
            where.assessmentId = filter.assessmentId;
        }

        if (filter.action) {
            where.action = Array.isArray(filter.action)
                ? { in: filter.action }
                : filter.action;
        }

        if (filter.changedBy) {
            where.changedBy = filter.changedBy;
        }

        if (filter.dateFrom || filter.dateTo) {
            where.changedAt = {};
            if (filter.dateFrom) {
                (where.changedAt as Record<string, unknown>).gte = filter.dateFrom;
            }
            if (filter.dateTo) {
                (where.changedAt as Record<string, unknown>).lte = filter.dateTo;
            }
        }

        const [data, total] = await Promise.all([
            this.prisma.assessmentAuditLog.findMany({
                where,
                include: {
                    changer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    assessment: {
                        select: {
                            id: true,
                            status: true,
                            student: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    studentNumber: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { changedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.assessmentAuditLog.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get distinct action types used in audit logs (for filter dropdowns).
     */
    async getDistinctActions(): Promise<string[]> {
        const results = await this.prisma.assessmentAuditLog.findMany({
            distinct: ['action'],
            select: { action: true },
            orderBy: { action: 'asc' },
        });
        return results.map((r) => r.action);
    }

    /**
     * Log a manual edit action to the manual_edit_audit_log table.
     */
    async logManualEdit(
        entityType: ManualEditEntityType,
        entityId: number,
        action: ManualEditAction,
        userId: number,
        fieldName?: string,
        oldValue?: string,
        newValue?: string,
        client?: Prisma.TransactionClient,
    ) {
        const prismaClient = client ?? this.prisma;

        return prismaClient.manualEditAuditLog.create({
            data: {
                entityType,
                entityId,
                action,
                fieldName: fieldName ?? null,
                oldValue: oldValue ?? null,
                newValue: newValue ?? null,
                changedBy: userId,
            },
        });
    }

    /**
     * Log multiple manual edit entries (e.g. student field changes + school reassignment).
     */
    async logMultipleManualEdits(
        entries: Array<{
            entityType: ManualEditEntityType;
            entityId: number;
            action: ManualEditAction;
            userId: number;
            fieldName?: string;
            oldValue?: string;
            newValue?: string;
        }>,
        client?: Prisma.TransactionClient,
    ) {
        const prismaClient = client ?? this.prisma;

        return Promise.all(
            entries.map((entry) =>
                prismaClient.manualEditAuditLog.create({
                    data: {
                        entityType: entry.entityType,
                        entityId: entry.entityId,
                        action: entry.action,
                        fieldName: entry.fieldName ?? null,
                        oldValue: entry.oldValue ?? null,
                        newValue: entry.newValue ?? null,
                        changedBy: entry.userId,
                    },
                }),
            ),
        );
    }

    /**
     * Log an action to the system audit log.
     */
    async logSystemEvent(
        action: SystemAction,
        performedBy: number,
        details?: Record<string, unknown>,
    ) {
        return this.prisma.systemAuditLog.create({
            data: {
                action,
                performedBy,
                details: details ? JSON.stringify(details) : null,
            },
        });
    }

    /**
     * Get the full system audit history: system operations, manual edits, and ingestion logs.
     * Returns all entries sorted by date descending.
     */
    async getSystemAuditHistory() {
        const [systemLogs, manualEditLogs, ingestionLogs] = await Promise.all([
            this.prisma.systemAuditLog.findMany({
                include: {
                    performer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { performedAt: 'desc' },
            }),
            this.prisma.manualEditAuditLog.findMany({
                include: {
                    changer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { changedAt: 'desc' },
            }),
            this.prisma.ingestionLog.findMany({
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const unified = [
            ...systemLogs.map((log) => ({
                source: 'SYSTEM' as const,
                id: log.id,
                action: log.action,
                date: log.performedAt,
                user: log.performer,
                details: {
                    cycleId: log.cycleId,
                    cycleName: log.cycleName,
                    cycleYear: log.cycleYear,
                    purgedAssessments: log.purgedAssessments,
                    purgedStudents: log.purgedStudents,
                    purgedAudioFiles: log.purgedAudioFiles,
                    extra: log.details ? JSON.parse(log.details) : null,
                },
            })),
            ...manualEditLogs.map((log) => ({
                source: 'MANUAL_EDIT' as const,
                id: log.id,
                action: log.action,
                date: log.changedAt,
                user: log.changer,
                details: {
                    entityType: log.entityType,
                    entityId: log.entityId,
                    fieldName: log.fieldName,
                    oldValue: log.oldValue,
                    newValue: log.newValue,
                },
            })),
            ...ingestionLogs.map((log) => ({
                source: 'INGESTION' as const,
                id: log.id,
                action: 'DATA_INGESTION',
                date: log.createdAt,
                user: null,
                details: {
                    entityType: log.entityType,
                    recordsTotal: log.recordsTotal,
                    recordsUpserted: log.recordsUpserted,
                    recordsFailed: log.recordsFailed,
                    errors: log.errors ? JSON.parse(log.errors) : null,
                    idempotencyKey: log.idempotencyKey,
                },
            })),
        ];

        unified.sort((a, b) => b.date.getTime() - a.date.getTime());

        return unified;
    }

    /**
     * Get manual edit audit logs for a specific entity.
     */
    async getManualEditLogs(entityType: ManualEditEntityType, entityId: number) {
        return this.prisma.manualEditAuditLog.findMany({
            where: { entityType, entityId },
            include: {
                changer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { changedAt: 'desc' },
        });
    }
}
