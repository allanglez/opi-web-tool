import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateClassDto {
  @IsBoolean()
  @IsOptional()
  isIncluded?: boolean;
}
