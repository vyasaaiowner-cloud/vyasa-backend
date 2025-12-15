import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  @IsNotEmpty()
  date: string; // ISO date string (YYYY-MM-DD)

  @IsString()
  @IsNotEmpty()
  name: string;
}
