import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  middleName?: string | null;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsInt()
  @IsOptional()
  grade?: number | null;

  @IsInt()
  @IsOptional()
  schoolId?: number;
}

export class UpdateStudentEnrollmentDto {
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  addClassIds?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  removeClassIds?: number[];
}
