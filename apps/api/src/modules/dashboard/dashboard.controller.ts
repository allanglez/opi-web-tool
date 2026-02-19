import { Controller, Get } from '@nestjs/common';
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
}
