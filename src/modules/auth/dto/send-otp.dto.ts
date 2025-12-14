import { IsPhoneNumber, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ default: '+91' })
  @IsString()
  countryCode: string;

  @ApiProperty({ default: '1234567890' })
  @IsString()
  mobileNo: string;

  @ApiProperty({ required: false, default: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}