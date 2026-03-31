import { Controller, Get, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UpdateClassDto } from './dto/update-class.dto';
import { BulkUpdateInclusionDto } from './dto/bulk-update-inclusion.dto';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('admin/schools')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all schools for filter dropdowns' })
  async getSchools() {
    return this.classesService.getSchools();
  }

  @Get('admin/programs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all programs for filter dropdowns' })
  async getPrograms() {
    return this.classesService.getPrograms();
  }

  @Get('admin/teachers')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all teachers for autocomplete selection' })
  async getTeachers() {
    return this.classesService.getTeachers();
  }

  @Get('admin/classes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all classes with school, program, and student counts (admin view)' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Filter by cycle ID' })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Filter by school' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program' })
  async getClasses(
    @Query('cycleId') cycleId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('programId') programId?: string,
  ) {
    return this.classesService.getClasses(
      cycleId ? parseInt(cycleId, 10) : undefined,
      schoolId ? parseInt(schoolId, 10) : undefined,
      programId ? parseInt(programId, 10) : undefined,
    );
  }

  @Patch('admin/classes/bulk-inclusion')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update inclusion status for multiple classes' })
  async bulkUpdateInclusion(@Body() dto: BulkUpdateInclusionDto) {
    return this.classesService.bulkUpdateInclusion(dto.classIds, dto.isIncluded);
  }

  @Patch('admin/classes/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update class properties such as inclusion status, teacher, grade, program' })
  async updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.classesService.updateClass(id, dto, user.id);
  }

  @Get('admin/classes/:id/edit-history')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get manual edit audit history for a class' })
  async getClassEditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.getClassEditHistory(id);
  }
}
