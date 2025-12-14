import { IsEmail, IsString, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(3)
  code: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(2)
  adminName: string;

  @IsPhoneNumber()
  adminPhone: string;
}
