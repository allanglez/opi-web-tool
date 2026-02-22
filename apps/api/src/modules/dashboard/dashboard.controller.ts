import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ADMIN', 'COORDINATOR')
  async getStats() {
    return this.dashboardService.getAdminDashboardStats();
  }

  @Get('verification')
  @Roles('ADMIN', 'COORDINATOR')
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
