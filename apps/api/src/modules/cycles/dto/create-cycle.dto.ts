import { IsString, IsInt, IsNotEmpty, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @IsNotEmpty()
  @Min(2000)
  year!: number;

  @IsDateString()
  @IsNotEmpty()
  startsOn!: string;

  @IsDateString()
  @IsNotEmpty()
  endsOn!: string;
}
