import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
