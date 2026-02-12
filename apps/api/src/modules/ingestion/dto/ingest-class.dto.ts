import { IsString, IsInt, IsOptional, IsNotEmpty, MaxLength, Min } from 'class-validator';

export class IngestClassDto {
  @IsInt()
  @IsNotEmpty()
  cycleId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  schoolCode!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  programName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  classCode!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  grade?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  courseTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  teacherId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  teacherName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  semesterTerm?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  roomNumber?: string;
}

export class BulkIngestClassesDto {
  @IsNotEmpty()
  classes!: IngestClassDto[];
}
