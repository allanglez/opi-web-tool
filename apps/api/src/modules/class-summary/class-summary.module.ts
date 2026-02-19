import { Module } from '@nestjs/common';
import { ClassSummaryController } from './class-summary.controller';
import { ClassSummaryService } from './class-summary.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClassSummaryController],
  providers: [ClassSummaryService],
  exports: [ClassSummaryService],
})
export class ClassSummaryModule {}
