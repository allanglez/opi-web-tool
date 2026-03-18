import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CyclesService } from './cycles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCycleDto } from './dto/create-cycle.dto';

@ApiTags('Cycles')
@ApiBearerAuth('access-token')
@Controller()
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get('cycles/active')
  @ApiOperation({ summary: 'Get the currently active assessment cycle' })
  async getActiveCycle() {
    return this.cyclesService.getActiveCycle();
  }

  @Post('admin/cycles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new assessment cycle (school year period)' })
  async createCycle(@Body() dto: CreateCycleDto, @CurrentUser() user: any) {
    return this.cyclesService.createCycle(dto, user.id);
  }

  @Post('admin/cycles/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve a cycle to enable evaluator access' })
  async approveCycle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.cyclesService.approveCycle(id, user.id);
  }

  @Get('admin/cycles/:id/ingestion-status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check data ingestion progress for a cycle' })
  async getIngestionStatus(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.getIngestionStatus(id);
  }
}
