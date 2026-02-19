import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { AuditService, AuditAction } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    /**
     * GET /audit/assessments/:id
     * Get the audit timeline for a specific assessment.
     * Accessible by EVALUATOR (own assessments), COORDINATOR, ADMIN.
     */
    @Get('assessments/:id')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getAssessmentTimeline(
        @Param('id', ParseIntPipe) assessmentId: number,
    ) {
        return this.auditService.getAssessmentAuditLogs(assessmentId);
    }

    /**
     * GET /audit/logs
     * Get paginated, filtered audit logs (admin view).
     * Supports filters: assessmentId, action, changedBy, dateFrom, dateTo, page, limit.
     */
    @Get('logs')
    @Roles('ADMIN')
    async getAuditLogs(
        @Query('assessmentId') assessmentId?: string,
        @Query('action') action?: string,
        @Query('changedBy') changedBy?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.getFilteredAuditLogs({
            assessmentId: assessmentId ? parseInt(assessmentId, 10) : undefined,
            action: action ? (action as AuditAction) : undefined,
            changedBy: changedBy ? parseInt(changedBy, 10) : undefined,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    /**
     * GET /audit/actions
     * Get distinct action types for filter dropdowns.
     */
    @Get('actions')
    @Roles('ADMIN', 'COORDINATOR')
    async getDistinctActions() {
        return this.auditService.getDistinctActions();
    }
}
