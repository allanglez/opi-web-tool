import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCycleDto } from './dto/create-cycle.dto';

@Controller()
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get('cycles/active')
  async getActiveCycle() {
    return this.cyclesService.getActiveCycle();
  }

  @Post('admin/cycles')
  @Roles('ADMIN')
  async createCycle(@Body() dto: CreateCycleDto, @CurrentUser() user: any) {
    return this.cyclesService.createCycle(dto, user.id);
  }

  @Post('admin/cycles/:id/approve')
  @Roles('ADMIN')
  async approveCycle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.cyclesService.approveCycle(id, user.id);
  }

  @Get('admin/cycles/:id/ingestion-status')
  @Roles('ADMIN')
  async getIngestionStatus(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.getIngestionStatus(id);
  }
}
