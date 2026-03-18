import { ApiProperty } from '@nestjs/swagger';

export class IngestionErrorDto {
  index!: number;
  error!: string;
}

export class IngestionResultDto {
  entityType!: string;
  recordsTotal!: number;
  recordsInserted!: number;
  recordsUpdated!: number;
  recordsFailed!: number;
  @ApiProperty({ type: [IngestionErrorDto] })
  errors!: IngestionErrorDto[];
  duration!: number;
}
