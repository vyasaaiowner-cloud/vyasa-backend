import { IsString, IsPhoneNumber, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ required: false, default: '+91' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, default: '1234567890' })
  @IsOptional()
  @IsString()
  mobileNo?: string;

  @ApiProperty({ default: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ required: false, default: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
