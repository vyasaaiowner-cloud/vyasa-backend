import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
