import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

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
}
