import { IsEnum, IsOptional, IsString, IsPhoneNumber, IsEmail, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ default: '+91' })
  @IsString()
  countryCode: string;

  @ApiProperty({ default: '1234567890' })
  @IsString()
  mobileNo: string;

  @ApiProperty({ default: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ enum: Role, default: Role.SUPER_ADMIN })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false, default: 'school-id-here' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiProperty({ default: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ default: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}
