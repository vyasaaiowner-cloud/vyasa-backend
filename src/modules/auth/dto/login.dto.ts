import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Country code with + prefix', example: '+91' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ description: 'Mobile number without country code', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  mobileNo: string;

  @ApiProperty({ description: '6-digit OTP received on mobile', example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
