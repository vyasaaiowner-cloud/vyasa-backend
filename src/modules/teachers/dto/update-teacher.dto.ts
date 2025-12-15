import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTeacherDto {
  @ApiProperty({ type: [String], description: 'Array of section IDs to assign', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionIds?: string[];
}
