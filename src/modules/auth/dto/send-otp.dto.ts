import { IsPhoneNumber, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ required: false, default: '+91' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, default: '1234567890' })
  @IsOptional()
  @IsString()
  mobileNo?: string;

  @ApiProperty({ required: false, default: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}