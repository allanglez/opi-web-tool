import { IsInt, IsNotEmpty } from 'class-validator';

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
