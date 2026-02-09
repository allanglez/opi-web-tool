import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CyclesModule } from '../cycles/cycles.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, CyclesModule, AuditModule],
    controllers: [AssessmentsController],
    providers: [AssessmentsService],
    exports: [AssessmentsService],
})
export class AssessmentsModule { }
