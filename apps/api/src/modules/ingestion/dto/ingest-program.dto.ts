import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class IngestProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class BulkIngestProgramsDto {
  @IsNotEmpty()
  programs!: IngestProgramDto[];
}
