import { Controller, Put, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DataWarehouseService } from './data-warehouse.service';
import { DataWarehouseRecordDto } from './dto/data-warehouse-push.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Scopes } from '../../common/decorators/scopes.decorator';

@ApiTags('Data Warehouse')
@ApiBearerAuth('access-token')
@Controller('data-warehouse')
export class DataWarehouseController {
  constructor(private readonly dataWarehouseService: DataWarehouseService) {}

  @Put('push')
  @Roles('ADMIN')
  @Scopes('ingest:schools')
  @ApiOperation({
    summary: 'Receive data from data warehouse ETL',
    description:
      'Accepts a JSON array of OPI records from the data warehouse. ' +
      'Replaces all existing staging data. New batch is created with status PENDING.',
  })
  async pushData(@Body() records: DataWarehouseRecordDto[]) {
    return this.dataWarehouseService.pushData(records);
  }

  @Post('seed')
  @Roles('ADMIN')
  @Scopes('ingest:schools')
  @ApiOperation({
    summary: 'Trigger seeding from staging data into app tables',
    description:
      'Admin triggers the actual ETL: deactivates current cycle, creates a new one, ' +
      'and seeds schools, programs, teachers, students, classes, and enrollments ' +
      'from the pending staging batch.',
  })
  async seedFromStaging() {
    return this.dataWarehouseService.seedFromStaging();
  }

  @Get('status')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get latest data warehouse batch status',
    description: 'Returns the status of the most recent data warehouse batch.',
  })
  async getStatus() {
    return this.dataWarehouseService.getStatus();
  }
}
