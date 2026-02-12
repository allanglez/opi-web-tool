import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateSchoolAssessmentDateDto {
  @IsDateString()
  assessmentDate!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roundId?: number;
}

export class BulkCreateSchoolAssessmentDatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  assessmentDates!: string[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roundId?: number;
}
