import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import {
  BulkCreateAssignmentsDto,
  CreateAssignmentDto,
  QueryAssignmentsDto,
} from './dto/assignments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('coordinator/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles('COORDINATOR', 'ADMIN')
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.createAssignment(dto, user.id);
  }

  @Post('bulk')
  @Roles('COORDINATOR', 'ADMIN')
  async createBulkAssignments(
    @Body() dto: BulkCreateAssignmentsDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.createBulkAssignments(dto, user.id);
  }

  @Get()
  @Roles('COORDINATOR', 'ADMIN')
  async findAssignments(@Query() query: QueryAssignmentsDto) {
    return this.assignmentsService.findAssignments(query);
  }

  @Get('management')
  @Roles('COORDINATOR', 'ADMIN')
  async getAssignmentManagement(
    @Query('cycleId') cycleId?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.assignmentsService.getAssignmentManagement(
      cycleId ? parseInt(cycleId, 10) : undefined,
      schoolId ? parseInt(schoolId, 10) : undefined,
    );
  }

  @Get('evaluators')
  @Roles('COORDINATOR', 'ADMIN')
  async getEvaluators() {
    return this.assignmentsService.getEvaluators();
  }

  @Get('workload')
  @Roles('COORDINATOR', 'ADMIN')
  async getWorkloadCounts(@Query('cycleId', ParseIntPipe) cycleId: number) {
    return this.assignmentsService.getEvaluatorWorkloadCounts(cycleId);
  }

  @Get('classes')
  @Roles('COORDINATOR', 'ADMIN')
  async getAssignableClasses(@Query('cycleId') cycleId?: string) {
    return this.assignmentsService.getAssignableClasses(
      cycleId ? parseInt(cycleId, 10) : undefined,
    );
  }

  @Delete(':id')
  @Roles('COORDINATOR', 'ADMIN')
  async deleteAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.deleteAssignment(id, user.id);
  }
}
