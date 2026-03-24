import { Module } from '@nestjs/common';
import { DataWarehouseController } from './data-warehouse.controller';
import { DataWarehouseService } from './data-warehouse.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DataWarehouseController],
  providers: [DataWarehouseService],
})
export class DataWarehouseModule {}
