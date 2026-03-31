import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SchedulingService } from './scheduling.service';
import {
  BulkCreateSchoolAssessmentDatesDto,
  CreateSchoolAssessmentDateDto,
} from './dto/scheduling.dto';

@ApiTags('Scheduling')
@ApiBearerAuth('access-token')
@Controller('coordinator')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('dashboard')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Coordinator dashboard: school assignment status, evaluator progress, and upcoming dates' })
  async getDashboard() {
    return this.schedulingService.getCoordinatorDashboard();
  }

  @Get('schools')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'List schools with assignment and scheduling counts for the active cycle' })
  async getSchools() {
    return this.schedulingService.getCoordinatorSchools();
  }

  @Get('scheduling')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Scheduling overview: school readiness status and upcoming assessment calendar' })
  async getSchedulingOverview() {
    return this.schedulingService.getSchedulingOverview();
  }

  @Get(':id/dates')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get all scheduled assessment dates for a specific school' })
  async getSchoolDates(@Param('id', ParseIntPipe) id: number) {
    return this.schedulingService.getSchoolDates(id);
  }

  @Post(':id/dates')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Schedule a new assessment date for a school' })
  async createSchoolDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSchoolAssessmentDateDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.schedulingService.createSchoolDate(id, dto, user.id);
  }

  @Post(':id/dates/bulk')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Bulk-schedule multiple assessment dates for a school' })
  async createSchoolDatesBulk(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkCreateSchoolAssessmentDatesDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.schedulingService.createSchoolDatesBulk(id, dto, user.id);
  }

  @Delete(':schoolId/dates/:id')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Remove a scheduled assessment date' })
  async deleteSchoolDate(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.schedulingService.deleteSchoolDate(schoolId, id, user.id);
  }
}
