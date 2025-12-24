import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CompleteGoogleRegistrationDto {
  @IsString()
  @IsNotEmpty()
  googleId: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsOptional()
  picture?: string;
}
