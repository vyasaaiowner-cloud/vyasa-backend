import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
