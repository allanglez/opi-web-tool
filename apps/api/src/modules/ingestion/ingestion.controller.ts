import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BulkIngestSchoolsDto } from './dto/ingest-school.dto';
import { BulkIngestProgramsDto } from './dto/ingest-program.dto';
import { BulkIngestClassesDto } from './dto/ingest-class.dto';
import { BulkIngestStudentsDto } from './dto/ingest-student.dto';
import { BulkIngestClassStudentsDto } from './dto/ingest-class-student.dto';

@ApiTags('Ingestion')
@ApiBearerAuth('access-token')
@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('schools')
  @Scopes('ingest:schools')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import/update schools from external data' })
  async ingestSchools(@Body() dto: BulkIngestSchoolsDto) {
    return this.ingestionService.ingestSchools(dto);
  }

  @Post('programs')
  @Scopes('ingest:schools')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import/update academic programs' })
  async ingestPrograms(@Body() dto: BulkIngestProgramsDto) {
    return this.ingestionService.ingestPrograms(dto);
  }

  @Post('classes')
  @Scopes('ingest:classes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import/update classes' })
  async ingestClasses(@Body() dto: BulkIngestClassesDto) {
    return this.ingestionService.ingestClasses(dto);
  }

  @Post('students')
  @Scopes('ingest:students')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import/update students' })
  async ingestStudents(@Body() dto: BulkIngestStudentsDto) {
    return this.ingestionService.ingestStudents(dto);
  }

  @Post('class-students')
  @Scopes('ingest:enrollments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import/update class-student enrollments' })
  async ingestClassStudents(@Body() dto: BulkIngestClassStudentsDto) {
    return this.ingestionService.ingestClassStudents(dto);
  }

  @Get('logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'View recent data ingestion history and results' })
  async getIngestionLogs(@Query('limit') limit?: string) {
    return this.ingestionService.getIngestionLogs(limit ? parseInt(limit, 10) : 50);
  }
}
