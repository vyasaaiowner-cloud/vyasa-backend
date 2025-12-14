import { IsEnum, IsOptional, IsString, IsPhoneNumber, IsEmail, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  otp: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;
}
