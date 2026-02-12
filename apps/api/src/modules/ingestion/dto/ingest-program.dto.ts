import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class IngestProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  opiType?: string;
}

export class BulkIngestProgramsDto {
  @IsNotEmpty()
  programs!: IngestProgramDto[];
}
