import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  targetAll: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetClass?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetSection?: string;
}
