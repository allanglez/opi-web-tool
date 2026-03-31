import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditAction } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
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
    @ApiOperation({ summary: 'Get the full change history timeline for a specific assessment' })
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
    @ApiOperation({ summary: 'Query paginated audit logs with filters (by assessment, action type, user, date range)' })
    @ApiQuery({ name: 'assessmentId', required: false, description: 'Filter by assessment ID' })
    @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
    @ApiQuery({ name: 'changedBy', required: false, description: 'Filter by user ID who made the change' })
    @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO string)' })
    @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO string)' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 25)' })
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
    @ApiOperation({ summary: 'Get the list of distinct audit action types (for filter dropdowns)' })
    async getDistinctActions() {
        return this.auditService.getDistinctActions();
    }

    /**
     * GET /audit/system
     * Full system audit history: purges, manual edits, and ingestion logs.
     */
    @Get('system')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get the full system audit history (purges, manual edits, ingestion) sorted by date' })
    async getSystemAuditHistory() {
        return this.auditService.getSystemAuditHistory();
    }
}
