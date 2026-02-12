import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditAction =
    | 'ASSIGNMENT_CREATE'
    | 'ASSIGNMENT_DELETE'
    | 'ASSESSMENT_START'
    | 'ASSESSMENT_COMPLETE'
    | 'ASSESSMENT_REOPEN'
    | 'ASSESSMENT_UPDATE'
    | 'ASSESSMENT_MARK_ABSENT';

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
    ) {
        return this.prisma.assessmentAuditLog.create({
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
     * Get audit logs for an assessment.
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
}
