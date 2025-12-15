import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateHolidayDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
