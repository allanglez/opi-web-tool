export class IngestionResultDto {
  entityType!: string;
  recordsTotal!: number;
  recordsInserted!: number;
  recordsUpdated!: number;
  recordsFailed!: number;
  errors!: Array<{ index: number; error: string }>;
  duration!: number;
}
