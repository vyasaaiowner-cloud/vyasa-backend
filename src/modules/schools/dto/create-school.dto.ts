import { IsEmail, IsString, IsPhoneNumber, MinLength, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ default: 'Sample School' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ default: 'SAMP' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ default: 'admin@sample.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ default: 'School Admin' })
  @IsString()
  @MinLength(2)
  adminName: string;

  @ApiProperty({ default: '+91' })
  @IsString()
  adminPhoneCode: string;

  @ApiProperty({ default: '1234567890' })
  @IsPhoneNumber('IN')
  adminPhoneNumber: string;
}
