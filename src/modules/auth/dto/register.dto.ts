import { IsEnum, IsOptional, IsString, IsEmail, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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

  @ApiProperty({ default: 'john.doe@example.com', required: false })
  @IsOptional()
  @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
  @IsEmail()
  email?: string;
}
