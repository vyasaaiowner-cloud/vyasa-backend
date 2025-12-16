import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from '../schools/dto/create-class.dto';
import { UpdateClassDto } from '../schools/dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateClassDto) {
    try {
      return await this.prisma.class.create({
        data: {
          name: dto.name.trim(),
          schoolId,
        },
        include: {
          sections: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Class already exists in this school');
      }
      throw e;
    }
  }

  async findAll(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      include: {
        sections: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(schoolId: string, classId: string) {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        sections: true,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData;
  }

  async update(schoolId: string, classId: string, dto: UpdateClassDto) {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    try {
      return await this.prisma.class.update({
        where: { id: classId },
        data: {
          ...(dto.name && { name: dto.name.trim() }),
        },
        include: {
          sections: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Class name already exists in this school');
      }
      throw e;
    }
  }

  async delete(schoolId: string, classId: string) {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        _count: {
          select: {
            students: true,
            sections: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    if (classData._count.students > 0) {
      throw new BadRequestException('Cannot delete class with existing students');
    }

    if (classData._count.sections > 0) {
      throw new BadRequestException('Cannot delete class with existing sections');
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    return { message: 'Class deleted successfully' };
  }
}
