import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CyclesModule } from '../cycles/cycles.module';

@Module({
    imports: [PrismaModule, CyclesModule],
    controllers: [AssignmentsController],
    providers: [AssignmentsService],
    exports: [AssignmentsService],
})
export class AssignmentsModule { }
