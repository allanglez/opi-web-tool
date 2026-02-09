import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class StartAssessmentDto {
    @IsInt()
    @Type(() => Number)
    studentId!: number;

    @IsInt()
    @Type(() => Number)
    cycleId!: number;
}

export class UpdateAssessmentDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10)
    @Type(() => Number)
    opiLevelId?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CompleteAssessmentDto {
    @IsInt()
    @Min(0)
    @Max(10)
    @Type(() => Number)
    opiLevelId!: number;

    @IsOptional()
    @IsString()
    notes?: string;
}
