import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, QueryAssignmentsDto } from './dto/assignments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) { }

    @Post('assignments')
    @Roles('COORDINATOR', 'ADMIN')
    async createAssignment(
        @Body() dto: CreateAssignmentDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assignmentsService.createAssignment(dto, user.id);
    }

    @Get('assignments')
    @Roles('COORDINATOR', 'ADMIN')
    async findAssignments(@Query() query: QueryAssignmentsDto) {
        return this.assignmentsService.findAssignments(query);
    }

    @Delete('assignments/:id')
    @Roles('COORDINATOR', 'ADMIN')
    async deleteAssignment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.assignmentsService.deleteAssignment(id, user.id);
    }

    @Get('assignments/evaluators')
    @Roles('COORDINATOR', 'ADMIN')
    async getEvaluators() {
        return this.assignmentsService.getEvaluators();
    }

    @Get('assignments/workload')
    @Roles('COORDINATOR', 'ADMIN')
    async getWorkloadCounts(@Query('cycleId', ParseIntPipe) cycleId: number) {
        return this.assignmentsService.getEvaluatorWorkloadCounts(cycleId);
    }
}
