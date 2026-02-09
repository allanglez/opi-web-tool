import {
    Controller,
    Get,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { EvaluatorService } from './evaluator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('evaluator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluatorController {
    constructor(private readonly evaluatorService: EvaluatorService) { }

    @Get('classes')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getAssignedClasses(@CurrentUser() user: { id: number }) {
        return this.evaluatorService.getAssignedClasses(user.id);
    }

    @Get('classes/:classId/students')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getClassStudents(
        @Param('classId', ParseIntPipe) classId: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.evaluatorService.getClassStudents(classId, user.id);
    }
}
