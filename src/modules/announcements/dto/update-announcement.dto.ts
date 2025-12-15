import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  targetAll?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetClass?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetSection?: string;
}
