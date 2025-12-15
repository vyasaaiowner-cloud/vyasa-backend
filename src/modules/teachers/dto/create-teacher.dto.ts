import { IsString, IsNotEmpty, IsArray, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mobileNo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ type: [String], description: 'Array of section IDs to assign', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionIds?: string[];
}
