import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RetentionService } from './retention.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Retention')
@ApiBearerAuth('access-token')
@Controller()
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  /**
   * GET /admin/retention/config
   * Get retention settings for all cycles (or a specific one).
   */
  @Get('admin/retention/config')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get data retention settings for assessment cycles' })
  async getRetentionConfig(@Query('cycleId') cycleId?: string) {
    const parsedCycleId = cycleId ? parseInt(cycleId, 10) : undefined;
    return this.retentionService.getRetentionConfig(parsedCycleId);
  }

  /**
   * PATCH /admin/retention/config
   * Update retention days for a specific cycle.
   */
  @Patch('admin/retention/config')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update retention period (days) for a specific cycle' })
  async updateRetentionConfig(
    @Body('cycleId', ParseIntPipe) cycleId: number,
    @Body('retentionDays') retentionDays: number | null,
  ) {
    const parsedDays = retentionDays !== null && retentionDays !== undefined
      ? parseInt(String(retentionDays), 10)
      : null;
    return this.retentionService.updateRetentionConfig(cycleId, parsedDays);
  }

  /**
   * POST /admin/reset
   * Start an annual reset: export then purge cycle data.
   */
  @Post('admin/reset')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start an annual data reset: export and purge cycle data' })
  async startReset(@Body('cycleId', ParseIntPipe) cycleId: number) {
    return this.retentionService.startReset(cycleId);
  }

  /**
   * GET /admin/reset/status
   * Check the status of the current reset operation.
   */
  @Get('admin/reset/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check the status of an ongoing reset operation' })
  getResetStatus() {
    return this.retentionService.getResetStatus();
  }
}
