import { Controller, Get, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateClassDto } from './dto/update-class.dto';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('admin/classes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all classes with school, program, and student counts (admin view)' })
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

  @Patch('admin/classes/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update class properties such as inclusion status and grade' })
  async updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(id, dto);
  }
}
