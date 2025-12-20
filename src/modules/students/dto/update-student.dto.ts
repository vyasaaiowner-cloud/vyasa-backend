import { IsString, IsOptional, IsNumber, IsArray, IsEmail, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ParentInfoDto {
  @ApiProperty({ required: false, description: 'Parent user ID if already exists' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobileNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

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

  @ApiProperty({ required: false, type: [ParentInfoDto], description: 'Array of parents to link (replaces existing)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentInfoDto)
  parents?: ParentInfoDto[];
}
