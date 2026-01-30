import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startsOn!: string;

  @IsDateString()
  @IsNotEmpty()
  endsOn!: string;
}
