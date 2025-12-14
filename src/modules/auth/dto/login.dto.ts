import { IsString, IsPhoneNumber, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ default: '+91' })
  @IsString()
  countryCode: string;

  @ApiProperty({ default: '1234567890' })
  @IsString()
  mobileNo: string;

  @ApiProperty({ default: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ required: false, default: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
