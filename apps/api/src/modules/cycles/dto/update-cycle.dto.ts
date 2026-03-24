import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateCycleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsDateString()
  @IsOptional()
  startsOn?: string;

  @IsDateString()
  @IsOptional()
  endsOn?: string;
}
