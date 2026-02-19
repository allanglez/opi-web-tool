import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
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
    @Type(() => Number)
    opiLevelId?: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    criteriaIds?: number[];
}

export class CompleteAssessmentDto {
    @IsInt()
    @Min(0)
    @Type(() => Number)
    opiLevelId!: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    criteriaIds?: number[];
}

export class ReEvaluateDto {
    @IsInt()
    @Min(0)
    @Type(() => Number)
    opiLevelId!: number;

    @IsString()
    reason!: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    criteriaIds?: number[];
}
