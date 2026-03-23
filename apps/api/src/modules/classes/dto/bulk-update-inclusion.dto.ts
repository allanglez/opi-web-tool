import { IsArray, IsBoolean, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkUpdateInclusionDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  classIds!: number[];

  @IsBoolean()
  isIncluded!: boolean;
}
