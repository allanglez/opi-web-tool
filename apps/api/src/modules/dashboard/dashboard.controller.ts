import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ADMIN', 'COORDINATOR')
  @ApiOperation({ summary: 'System-wide admin dashboard: overall progress, school completion rates, evaluator workload, and recent activity' })
  async getStats() {
    return this.dashboardService.getAdminDashboardStats();
  }

  @Get('verification')
  @Roles('ADMIN', 'COORDINATOR')
  @ApiOperation({ summary: 'Assessment verification view with full filtering across the system' })
  async getVerification(
    @Query('schoolId') schoolId?: string,
    @Query('classId') classId?: string,
    @Query('evaluatorId') evaluatorId?: string,
    @Query('reEval') reEval?: string,
    @Query('status') status?: string,
    @Query('programId') programId?: string,
  ) {
    return this.dashboardService.getVerificationData({
      schoolId: schoolId ? parseInt(schoolId, 10) : undefined,
      classId: classId ? parseInt(classId, 10) : undefined,
      evaluatorId: evaluatorId ? parseInt(evaluatorId, 10) : undefined,
      reEval,
      status,
      programId: programId ? parseInt(programId, 10) : undefined,
    });
  }
}
