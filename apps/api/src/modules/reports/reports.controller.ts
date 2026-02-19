import {
    Controller,
    Get,
    Query,
    ParseIntPipe,
    BadRequestException,
    Header,
    StreamableFile,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    /**
     * GET /reports/export?cycleId=&roundId=
     * M2M export endpoint — returns minimal fields (student_number, opi_level, status).
     * Accessible via M2M scope `reports:export` OR ADMIN role.
     * Always returns JSON. Use /reports/export/csv for CSV format.
     */
    @Get('export')
    @Scopes('reports:export')
    @Roles('ADMIN')
    async exportData(
        @Query('cycleId', ParseIntPipe) cycleId: number,
        @Query('roundId') roundId?: string,
    ) {
        if (!cycleId) {
            throw new BadRequestException('cycleId is required');
        }

        return this.reportsService.getExportData({
            cycleId,
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
    async exportDataCsv(
        @Query('cycleId', ParseIntPipe) cycleId: number,
        @Query('roundId') roundId?: string,
    ) {
        if (!cycleId) {
            throw new BadRequestException('cycleId is required');
        }

        const data = await this.reportsService.getExportData({
            cycleId,
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
    async progressReport(
        @Query('cycleId', ParseIntPipe) cycleId: number,
        @Query('roundId') roundId?: string,
    ) {
        if (!cycleId) {
            throw new BadRequestException('cycleId is required');
        }

        return this.reportsService.getProgressReport({
            cycleId,
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
    async progressReportCsv(
        @Query('cycleId', ParseIntPipe) cycleId: number,
        @Query('roundId') roundId?: string,
    ) {
        if (!cycleId) {
            throw new BadRequestException('cycleId is required');
        }

        const data = await this.reportsService.getProgressReport({
            cycleId,
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
    async exportSummary(
        @Query('cycleId', ParseIntPipe) cycleId: number,
    ) {
        if (!cycleId) {
            throw new BadRequestException('cycleId is required');
        }

        return this.reportsService.getExportSummary(cycleId);
    }
}
