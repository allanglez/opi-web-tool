import {
    Controller,
    Get,
    Query,
    BadRequestException,
    Header,
    StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CyclesService } from '../cycles/cycles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Scopes } from '../../common/decorators/scopes.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly cyclesService: CyclesService,
    ) { }

    private async resolveCycleId(cycleId?: string): Promise<number> {
        if (cycleId) {
            const parsed = parseInt(cycleId, 10);
            if (isNaN(parsed)) {
                throw new BadRequestException('cycleId must be a valid number');
            }
            return parsed;
        }

        const activeCycle = await this.cyclesService.getActiveCycle();
        if (!activeCycle) {
            throw new BadRequestException('No active cycle found. Please provide a cycleId.');
        }
        return activeCycle.id;
    }

    /**
     * GET /reports/export?cycleId=&roundId=
     * M2M export endpoint — returns minimal fields (student_number, opi_level, status).
     * Accessible via M2M scope `reports:export` OR ADMIN role.
     * Always returns JSON. Use /reports/export/csv for CSV format.
     */
    @Get('export')
    @Scopes('reports:export')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Export assessment results as JSON (student number, OPI level, status). M2M-friendly endpoint' })
    @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
    @ApiQuery({ name: 'roundId', required: false, description: 'Filter by assessment round' })
    async exportData(
        @Query('cycleId') cycleId?: string,
        @Query('roundId') roundId?: string,
    ) {
        const resolvedCycleId = await this.resolveCycleId(cycleId);

        return this.reportsService.getExportData({
            cycleId: resolvedCycleId,
            roundId: roundId ? parseInt(roundId, 10) : undefined,
        });
    }

    /**
     * GET /reports/export/csv?cycleId=&roundId=
     * M2M export as CSV download.
     */
    @Get('export/csv')
    @Scopes('reports:export')
    @Roles('ADMIN')
    @Header('Content-Type', 'text/csv')
    @ApiOperation({ summary: 'Export assessment results as a CSV download. M2M-friendly endpoint' })
    @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
    @ApiQuery({ name: 'roundId', required: false, description: 'Filter by assessment round' })
    async exportDataCsv(
        @Query('cycleId') cycleId?: string,
        @Query('roundId') roundId?: string,
    ) {
        const resolvedCycleId = await this.resolveCycleId(cycleId);

        const data = await this.reportsService.getExportData({
            cycleId: resolvedCycleId,
            roundId: roundId ? parseInt(roundId, 10) : undefined,
        });

        const csv = this.reportsService.toCsv(
            data as unknown as Record<string, unknown>[],
        );
        return new StreamableFile(Buffer.from(csv, 'utf-8'));
    }

    /**
     * GET /reports/progress?cycleId=&roundId=
     * Coordinator progress report with full student details (JSON).
     */
    @Get('progress')
    @Roles('COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Detailed progress report with full student information (coordinator view)' })
    @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
    @ApiQuery({ name: 'roundId', required: false, description: 'Filter by assessment round' })
    async progressReport(
        @Query('cycleId') cycleId?: string,
        @Query('roundId') roundId?: string,
    ) {
        const resolvedCycleId = await this.resolveCycleId(cycleId);

        return this.reportsService.getProgressReport({
            cycleId: resolvedCycleId,
            roundId: roundId ? parseInt(roundId, 10) : undefined,
        });
    }

    /**
     * GET /reports/progress/csv?cycleId=&roundId=
     * Coordinator progress report as CSV download.
     */
    @Get('progress/csv')
    @Roles('COORDINATOR', 'ADMIN')
    @Header('Content-Type', 'text/csv')
    @ApiOperation({ summary: 'Progress report as a CSV download' })
    @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
    @ApiQuery({ name: 'roundId', required: false, description: 'Filter by assessment round' })
    async progressReportCsv(
        @Query('cycleId') cycleId?: string,
        @Query('roundId') roundId?: string,
    ) {
        const resolvedCycleId = await this.resolveCycleId(cycleId);

        const data = await this.reportsService.getProgressReport({
            cycleId: resolvedCycleId,
            roundId: roundId ? parseInt(roundId, 10) : undefined,
        });

        const csv = this.reportsService.toCsv(
            data as unknown as Record<string, unknown>[],
        );
        return new StreamableFile(Buffer.from(csv, 'utf-8'));
    }

    /**
     * GET /reports/summary?cycleId=
     * Export summary with stats — used by admin export page.
     */
    @Get('summary')
    @Roles('COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Export summary with aggregated statistics for a cycle' })
    @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
    async exportSummary(
        @Query('cycleId') cycleId?: string,
    ) {
        const resolvedCycleId = await this.resolveCycleId(cycleId);

        return this.reportsService.getExportSummary(resolvedCycleId);
    }
}
