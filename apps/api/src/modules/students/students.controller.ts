import { Controller, Get, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UpdateStudentDto, UpdateStudentEnrollmentDto } from './dto/update-student.dto';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('admin/students')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List students for a cycle with optional school filter' })
  async getStudents(
    @Query('cycleId', ParseIntPipe) cycleId: number,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.studentsService.getStudentsByCycle(
      cycleId,
      schoolId ? parseInt(schoolId, 10) : undefined,
    );
  }

  @Get('admin/students/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get student details including enrollments and edit history' })
  async getStudent(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getStudent(id);
  }

  @Patch('admin/students/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update student fields (manual correction)' })
  async updateStudent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentsService.updateStudent(id, dto, user.id);
  }

  @Patch('admin/students/:id/enrollment')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update student class enrollments (add/remove)' })
  async updateStudentEnrollment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentsService.updateStudentEnrollment(id, dto, user.id);
  }

  @Get('admin/students/:id/edit-history')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get manual edit audit history for a student' })
  async getStudentEditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getStudentEditHistory(id);
  }
}
