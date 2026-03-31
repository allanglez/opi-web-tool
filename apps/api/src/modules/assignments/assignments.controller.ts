import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import {
  BulkCreateAssignmentsDto,
  CreateAssignmentDto,
  QueryAssignmentsDto,
} from './dto/assignments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CyclesService } from '../cycles/cycles.service';

@ApiTags('Assignments')
@ApiBearerAuth('access-token')
@Controller('coordinator/assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly cyclesService: CyclesService,
  ) {}

  @Post()
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Assign an evaluator to a class for the active cycle' })
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.createAssignment(dto, user.id);
  }

  @Post('bulk')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Bulk-assign evaluators to multiple classes at once' })
  async createBulkAssignments(
    @Body() dto: BulkCreateAssignmentsDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.createBulkAssignments(dto, user.id);
  }

  @Get()
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Query existing evaluator-to-class assignments with filters' })
  async findAssignments(@Query() query: QueryAssignmentsDto) {
    return this.assignmentsService.findAssignments(query);
  }

  @Get('management')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Full assignment management view with classes, evaluator workload, and progress stats' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Filter by school' })
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
  @ApiOperation({ summary: 'List all active users with the EVALUATOR role (for assignment dropdowns)' })
  async getEvaluators() {
    return this.assignmentsService.getEvaluators();
  }

  @Get('workload')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get evaluator workload counts (classes per evaluator) for the cycle' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
  async getWorkloadCounts(@Query('cycleId') cycleId?: string) {
    let resolvedCycleId: number;
    if (cycleId) {
      resolvedCycleId = parseInt(cycleId, 10);
      if (isNaN(resolvedCycleId)) {
        throw new BadRequestException('cycleId must be a valid number');
      }
    } else {
      const activeCycle = await this.cyclesService.getActiveCycle();
      if (!activeCycle) {
        throw new BadRequestException('No active cycle found. Please provide a cycleId.');
      }
      resolvedCycleId = activeCycle.id;
    }
    return this.assignmentsService.getEvaluatorWorkloadCounts(resolvedCycleId);
  }

  @Get('classes')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'List classes available for assignment (included classes in active cycle)' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Defaults to the active cycle if omitted' })
  async getAssignableClasses(@Query('cycleId') cycleId?: string) {
    return this.assignmentsService.getAssignableClasses(
      cycleId ? parseInt(cycleId, 10) : undefined,
    );
  }

  @Delete(':id')
  @Roles('COORDINATOR', 'ADMIN')
  @ApiOperation({ summary: 'Remove an evaluator-to-class assignment' })
  async deleteAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.assignmentsService.deleteAssignment(id, user.id);
  }
}
