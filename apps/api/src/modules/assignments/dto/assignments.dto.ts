import { IsInt, IsOptional } from 'class-validator';
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
