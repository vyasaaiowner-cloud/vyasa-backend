import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export interface HolidayRow {
  name: string;
  date: string;
  description?: string;
  type?: string;
}

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createHolidayDto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: {
        schoolId,
        date: new Date(createHolidayDto.date),
        name: createHolidayDto.name,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.holiday.findMany({
      where: { schoolId },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    return this.prisma.holiday.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  }

  async update(id: string, schoolId: string, updateHolidayDto: UpdateHolidayDto) {
    return this.prisma.holiday.update({
      where: {
        id,
        schoolId,
      },
      data: {
        ...(updateHolidayDto.date && { date: new Date(updateHolidayDto.date) }),
        ...(updateHolidayDto.name && { name: updateHolidayDto.name }),
      },
    });
  }

  async remove(id: string, schoolId: string) {
    return this.prisma.holiday.delete({
      where: {
        id,
        schoolId,
      },
    });
  }

  async bulkUploadHolidays(file: Express.Multer.File, schoolId: string) {
    const data = this.parseFile(file);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; data: HolidayRow; error: string }>,
      totalRows: data.length,
    };

    // Validate school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new BadRequestException('Invalid school');
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Validate required fields
        if (!row.name || !row.date) {
          throw new Error('Name and date are required fields');
        }

        // Parse and validate date
        const holidayDate = new Date(row.date);
        if (isNaN(holidayDate.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY');
        }

        // Create holiday
        await this.prisma.holiday.create({
          data: {
            name: row.name.trim(),
            date: holidayDate,
            schoolId,
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // Excel row number (header is row 1)
          data: row,
          error: error.message,
        });
      }
    }

    return {
      message: 'Bulk upload completed',
      results,
    };
  }

  private parseFile(file: Express.Multer.File): HolidayRow[] {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv') {
        const records = parse(file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        return records as HolidayRow[];
      } else if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json<HolidayRow>(
          workbook.Sheets[sheetName],
        );
        return data;
      }

      throw new BadRequestException('Unsupported file format');
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse file: ${error.message}`,
      );
    }
  }
}
