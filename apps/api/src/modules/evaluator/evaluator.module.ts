import { Module } from '@nestjs/common';
import { EvaluatorController } from './evaluator.controller';
import { EvaluatorService } from './evaluator.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CyclesModule } from '../cycles/cycles.module';

@Module({
    imports: [PrismaModule, CyclesModule],
    controllers: [EvaluatorController],
    providers: [EvaluatorService],
    exports: [EvaluatorService],
})
export class EvaluatorModule { }
