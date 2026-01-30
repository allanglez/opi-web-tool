import { IsString, IsInt, IsOptional, IsNotEmpty, MaxLength, Min } from 'class-validator';

export class IngestStudentDto {
  @IsInt()
  @IsNotEmpty()
  cycleId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  schoolCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  studentNumber!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  aspenStudentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  grade?: number;
}

export class BulkIngestStudentsDto {
  @IsNotEmpty()
  students!: IngestStudentDto[];
}
