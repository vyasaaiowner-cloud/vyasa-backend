import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Country code with + prefix', example: '+91' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ description: 'Mobile number without country code', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  mobileNo: string;
}