import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CyclesModule } from '../cycles/cycles.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [PrismaModule, CyclesModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
