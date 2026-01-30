import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class IngestSchoolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  schoolCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  schoolType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;
}

export class BulkIngestSchoolsDto {
  @IsNotEmpty()
  schools!: IngestSchoolDto[];
}
