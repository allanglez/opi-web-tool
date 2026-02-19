import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class IngestClassStudentDto {
  @IsInt()
  @IsNotEmpty()
  cycleId!: number;

  @IsInt()
  @IsNotEmpty()
  classId!: number;

  @IsInt()
  @IsNotEmpty()
  studentId!: number;
}

export class BulkIngestClassStudentsDto {
  @IsNotEmpty()
  enrollments!: IngestClassStudentDto[];
}

export class IngestClassStudentByKeyDto {
  @IsInt()
  @IsNotEmpty()
  cycleId!: number;

  @IsString()
  @IsNotEmpty()
  schoolCode!: string;

  @IsString()
  @IsNotEmpty()
  classCode!: string;

  @IsString()
  @IsNotEmpty()
  studentNumber!: string;

  @IsString()
  semesterTerm?: string;
}

export class BulkIngestClassStudentsByKeyDto {
  @IsNotEmpty()
  enrollments!: IngestClassStudentByKeyDto[];
}
