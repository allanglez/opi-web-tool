import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    ParseIntPipe,
} from '@nestjs/common';
import { EvaluatorService } from './evaluator.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('evaluator')
export class EvaluatorController {
    constructor(private readonly evaluatorService: EvaluatorService) { }

    @Get('dashboard')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getDashboard(@CurrentUser() user: { id: number }) {
        return this.evaluatorService.getDashboard(user.id);
    }

    @Get('assignments')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getAssignments(
        @CurrentUser() user: { id: number },
        @Query('schoolId') schoolId?: string,
    ) {
        return this.evaluatorService.getAssignments(
            user.id,
            schoolId ? parseInt(schoolId, 10) : undefined,
        );
    }

    @Get('class-view')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getClassView(
        @CurrentUser() user: { id: number },
        @Query('schoolId') schoolId?: string,
        @Query('classId') classId?: string,
    ) {
        return this.evaluatorService.getClassView(
            user.id,
            schoolId ? parseInt(schoolId, 10) : undefined,
            classId ? parseInt(classId, 10) : undefined,
        );
    }

    @Get('classes/:classId/notes')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async getClassNotes(
        @Param('classId', ParseIntPipe) classId: number,
        @CurrentUser() user: { id: number },
    ) {
        return this.evaluatorService.getClassNotes(classId, user.id);
    }

    @Post('classes/:classId/notes')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async saveClassNotes(
        @Param('classId', ParseIntPipe) classId: number,
        @CurrentUser() user: { id: number },
        @Body('note') note: string,
    ) {
        return this.evaluatorService.saveClassNotes(classId, user.id, note);
    }

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
