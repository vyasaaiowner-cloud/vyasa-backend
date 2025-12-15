import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  className: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty()
  @IsNumber()
  rollNo: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentCountryCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentMobileNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  parentEmail?: string;
}
