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
        @CurrentUser() user: { id: number; roles: string[] },
        @Query('schoolId') schoolId?: string,
        @Query('classId') classId?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        const isCoordinatorOrAdmin = user.roles.includes('COORDINATOR') || user.roles.includes('ADMIN');
        
        if (isCoordinatorOrAdmin) {
            return this.evaluatorService.getClassViewAll(
                schoolId ? parseInt(schoolId, 10) : undefined,
                classId ? parseInt(classId, 10) : undefined,
                page ? parseInt(page, 10) : 1,
                pageSize ? parseInt(pageSize, 10) : 25,
            );
        }
        
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
        @CurrentUser() user: { id: number; roles: string[] },
    ) {
        return this.evaluatorService.getClassNotes(classId, user.id, user.roles);
    }

    @Post('classes/:classId/notes')
    @Roles('EVALUATOR', 'COORDINATOR', 'ADMIN')
    async saveClassNotes(
        @Param('classId', ParseIntPipe) classId: number,
        @CurrentUser() user: { id: number; roles: string[] },
        @Body('note') note: string,
    ) {
        return this.evaluatorService.saveClassNotes(classId, user.id, user.roles, note);
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
        @CurrentUser() user: { id: number; roles: string[] },
    ) {
        return this.evaluatorService.getClassStudents(classId, user.id, user.roles);
    }
}
