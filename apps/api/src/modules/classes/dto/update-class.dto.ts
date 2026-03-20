import { IsBoolean, IsOptional, IsInt } from 'class-validator';

export class UpdateClassDto {
  @IsBoolean()
  @IsOptional()
  isIncluded?: boolean;

  @IsInt()
  @IsOptional()
  grade?: number | null;

  @IsInt()
  @IsOptional()
  programId?: number | null;

  @IsInt()
  @IsOptional()
  teacherId?: number | null;
}
