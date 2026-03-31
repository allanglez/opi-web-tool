import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CyclesModule } from '../cycles/cycles.module';
import { AuditModule } from '../audit/audit.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [PrismaModule, CyclesModule, AuditModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
