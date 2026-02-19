import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SchedulingService } from './scheduling.service';
import {
  BulkCreateSchoolAssessmentDatesDto,
  CreateSchoolAssessmentDateDto,
} from './dto/scheduling.dto';

@Controller('coordinator')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('dashboard')
  @Roles('COORDINATOR', 'ADMIN')
  async getDashboard() {
    return this.schedulingService.getCoordinatorDashboard();
  }

  @Get('schools')
  @Roles('COORDINATOR', 'ADMIN')
  async getSchools() {
    return this.schedulingService.getCoordinatorSchools();
  }

  @Get('scheduling')
  @Roles('COORDINATOR', 'ADMIN')
  async getSchedulingOverview() {
    return this.schedulingService.getSchedulingOverview();
  }

  @Get(':id/dates')
  @Roles('COORDINATOR', 'ADMIN')
  async getSchoolDates(@Param('id', ParseIntPipe) id: number) {
    return this.schedulingService.getSchoolDates(id);
  }

  @Post(':id/dates')
  @Roles('COORDINATOR', 'ADMIN')
  async createSchoolDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSchoolAssessmentDateDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.schedulingService.createSchoolDate(id, dto, user.id);
  }

  @Post(':id/dates/bulk')
  @Roles('COORDINATOR', 'ADMIN')
  async createSchoolDatesBulk(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkCreateSchoolAssessmentDatesDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.schedulingService.createSchoolDatesBulk(id, dto, user.id);
  }

  @Delete(':schoolId/dates/:id')
  @Roles('COORDINATOR', 'ADMIN')
  async deleteSchoolDate(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.schedulingService.deleteSchoolDate(schoolId, id);
  }
}
