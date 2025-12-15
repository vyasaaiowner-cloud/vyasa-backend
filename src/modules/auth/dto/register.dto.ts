import { IsEnum, IsOptional, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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

  @ApiProperty({ enum: Role, example: Role.SCHOOL_ADMIN })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false, description: 'School ID (required for non-SUPER_ADMIN roles)' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;
}
