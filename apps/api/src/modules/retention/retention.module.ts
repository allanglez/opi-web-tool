import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, ReportsModule],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
