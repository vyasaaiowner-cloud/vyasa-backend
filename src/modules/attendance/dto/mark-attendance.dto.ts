import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

class StudentAttendanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsNotEmpty()
  status: AttendanceStatus;
}

export class MarkAttendanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ type: [StudentAttendanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  attendances: StudentAttendanceDto[];
}
