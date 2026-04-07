import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import {
    StartAssessmentDto,
    UpdateAssessmentDto,
    CompleteAssessmentDto,
    ReEvaluateDto,
} from './dto/assessments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Assessments')
@ApiBearerAuth('access-token')
@Controller('assessments')
export class AssessmentsController {
    constructor(private readonly assessmentsService: AssessmentsService) { }

    @Post('start')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Start a new OPI assessment for a student' })
    async startAssessment(
        @Body() dto: StartAssessmentDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.startAssessment(dto, user.id, user.roles);
    }

    @Get(':id')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Get full assessment details including scores and audio' })
    async getAssessment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.getAssessment(id, user.id);
    }

    @Patch(':id')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Update an in-progress assessment with partial scores or notes' })
    async updateAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAssessmentDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.updateAssessment(id, dto, user.id, user.roles);
    }

    @Post(':id/complete')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Mark an assessment as completed with final scores' })
    async completeAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CompleteAssessmentDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.completeAssessment(id, dto, user.id, user.roles);
    }

    @Post(':id/reopen')
    @Roles('COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Reopen a completed assessment for corrections (coordinator/admin only)' })
    async reopenAssessment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.reopenAssessment(id, user.id);
    }

    @Post(':id/mark-absent')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Mark a student as absent for their assessment' })
    async markAbsent(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.markAbsent(id, user.id, user.roles);
    }

    @Post(':id/reset-absent')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Reset an absent assessment back to in-progress and reassign to the current user' })
    async resetAbsent(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthUser,
    ) {
        return this.assessmentsService.resetAbsent(id, user.id);
    }

    @Get('opi-levels')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Get all available OPI proficiency levels for scoring' })
    async getOpiLevels() {
        return this.assessmentsService.getOpiLevels();
    }

    @Post('classes/:classId/submit')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Submit all assessments for a class as finalized' })
    async submitClass(
        @Param('classId', ParseIntPipe) classId: number,
        @Body() submitData: { submittedBy: number; notes?: string },
        @CurrentUser() _user: { id: number },
    ) {
        return this.assessmentsService.submitClassAssessment(classId, submitData);
    }

    @Post(':id/validate-submission')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Check if an assessment meets all submission requirements' })
    async validateSubmission(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() _user: { id: number },
    ) {
        return this.assessmentsService.validateSubmissionRequirements(id);
    }

    @Post(':id/flag-review')
    @Roles('COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Flag an assessment for coordinator review with a reason' })
    async flagForReview(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: { reason: string },
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.flagForReview(id, data.reason, user.id);
    }

    @Patch(':id/re-evaluate')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    @ApiOperation({ summary: 'Re-evaluate a completed assessment with new scores' })
    async reEvaluateAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ReEvaluateDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.reEvaluateAssessment(id, dto, user.id);
    }
}
