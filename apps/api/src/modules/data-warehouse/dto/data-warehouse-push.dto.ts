import {
  IsString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DataWarehouseRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'French Immersion Programs' })
  OPI_TYPE!: string;

  @IsInt()
  @ApiProperty({ example: 9898001 })
  SCHOOL_NUMBER!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'F.H. Collins Secondary School' })
  SCHOOL_NAME!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ApiProperty({ example: '8-12', required: false })
  SCHOOL_TYPE?: string;

  @IsInt()
  @ApiProperty({ example: 2026 })
  SCHOOL_YEAR!: number;

  @IsInt()
  @ApiProperty({ example: 1279128 })
  STUDENT_NUMBER!: number;

  @IsInt()
  @IsOptional()
  @ApiProperty({ example: 521812040, required: false })
  PEN?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Manning' })
  STUDENT_LAST_NAME!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Khaleesi' })
  STUDENT_FIRST_NAME!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @ApiProperty({ example: 'Anais', required: false })
  STUDENT_MIDDLE_NAME?: string;

  @IsInt()
  @ApiProperty({ example: 9 })
  GRADE!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ example: 'FFRAL09 01' })
  COURSE!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'FRANÇAIS LANGUE SECONDE-IMMERSION 9' })
  COURSE_TITLE!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ example: '718888' })
  TEACHER_ID!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'Kathryn Kimber' })
  TEACHER_NAME!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @ApiProperty({ example: 'S1' })
  SEMESTER_TERM!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ example: '98 FI' })
  PROGRAM_CODE!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'French Immersion' })
  PROGRAM_DESCRIPTION!: string;

  @IsString()
  @IsOptional()
  json_featuretype?: string;
}

export class DataWarehousePushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataWarehouseRecordDto)
  @ApiProperty({ type: [DataWarehouseRecordDto] })
  records!: DataWarehouseRecordDto[];
}
