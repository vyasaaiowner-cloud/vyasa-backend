import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStudentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rollNo?: number;
}
