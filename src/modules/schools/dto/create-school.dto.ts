import { IsEmail, IsString, IsPhoneNumber, MinLength, IsOptional } from 'class-validator';
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

  @ApiProperty({ required: false, example: '123 Main Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false, example: '400001' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiProperty({ required: false, example: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, example: 'contact@school.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false, example: '+91' })
  @IsOptional()
  @IsString()
  contactCountryCode?: string;

  @ApiProperty({ required: false, example: '+911234567890' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

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
