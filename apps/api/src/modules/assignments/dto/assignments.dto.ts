import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
    @IsInt()
    @Type(() => Number)
    cycleId!: number;

    @IsInt()
    @Type(() => Number)
    classId!: number;

    @IsInt()
    @Type(() => Number)
    evaluatorId!: number;
}

export class QueryAssignmentsDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    cycleId?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    classId?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    evaluatorId?: number;
}

export class BulkAssignmentItemDto {
    @IsInt()
    @Type(() => Number)
    classId!: number;

    @IsInt()
    @Type(() => Number)
    evaluatorId!: number;
}

export class BulkCreateAssignmentsDto {
    @IsInt()
    @Type(() => Number)
    cycleId!: number;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => BulkAssignmentItemDto)
    assignments!: BulkAssignmentItemDto[];
}
