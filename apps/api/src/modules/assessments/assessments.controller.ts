import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import {
    StartAssessmentDto,
    UpdateAssessmentDto,
    CompleteAssessmentDto,
    ReEvaluateDto,
} from './dto/assessments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('assessments')
export class AssessmentsController {
    constructor(private readonly assessmentsService: AssessmentsService) { }

    @Post('start')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async startAssessment(
        @Body() dto: StartAssessmentDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.startAssessment(dto, user.id);
    }

    @Get(':id')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getAssessment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.getAssessment(id, user.id);
    }

    @Patch(':id')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async updateAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAssessmentDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.updateAssessment(id, dto, user.id);
    }

    @Post(':id/complete')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async completeAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CompleteAssessmentDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.completeAssessment(id, dto, user.id);
    }

    @Post(':id/reopen')
    @Roles('COORDINATOR', 'ADMIN')
    async reopenAssessment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.reopenAssessment(id, user.id);
    }

    @Post(':id/mark-absent')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async markAbsent(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.markAbsent(id, user.id);
    }

    @Get('opi-levels')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getOpiLevels() {
        return this.assessmentsService.getOpiLevels();
    }

    @Post('classes/:classId/submit')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async submitClass(
        @Param('classId', ParseIntPipe) classId: number,
        @Body() submitData: { submittedBy: number; notes?: string },
        @CurrentUser() _user: { id: number },
    ) {
        return this.assessmentsService.submitClassAssessment(classId, submitData);
    }

    @Post(':id/validate-submission')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async validateSubmission(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() _user: { id: number },
    ) {
        return this.assessmentsService.validateSubmissionRequirements(id);
    }

    @Post(':id/flag-review')
    @Roles('COORDINATOR', 'ADMIN')
    async flagForReview(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: { reason: string },
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.flagForReview(id, data.reason, user.id);
    }

    @Patch(':id/re-evaluate')
    @Roles('COORDINATOR', 'ADMIN')
    async reEvaluateAssessment(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ReEvaluateDto,
        @CurrentUser() user: { id: number },
    ) {
        return this.assessmentsService.reEvaluateAssessment(id, dto, user.id);
    }
}
