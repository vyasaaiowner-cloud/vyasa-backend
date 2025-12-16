import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSectionDto } from '../schools/dto/create-section.dto';
import { UpdateSectionDto } from '../schools/dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateSectionDto) {
    const classData = await this.prisma.class.findFirst({
      where: {
        id: dto.classId,
        schoolId,
      },
    });

    if (!classData) {
      throw new BadRequestException('Class not found or does not belong to this school');
    }

    try {
      return await this.prisma.section.create({
        data: {
          name: dto.name.trim(),
          classId: dto.classId,
          schoolId,
        },
        include: {
          class: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Section already exists in this class');
      }
      throw e;
    }
  }

  async findAll(schoolId: string, classId?: string) {
    const where: any = { schoolId };
    if (classId) {
      where.classId = classId;
    }

    return this.prisma.section.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: [
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async findOne(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
      },
      include: {
        class: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async update(schoolId: string, sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (dto.classId) {
      const classData = await this.prisma.class.findFirst({
        where: {
          id: dto.classId,
          schoolId,
        },
      });

      if (!classData) {
        throw new BadRequestException('Class not found or does not belong to this school');
      }
    }

    try {
      return await this.prisma.section.update({
        where: { id: sectionId },
        data: {
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.classId && { classId: dto.classId }),
        },
        include: {
          class: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Section name already exists in this class');
      }
      throw e;
    }
  }

  async delete(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        schoolId,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (section._count.students > 0) {
      throw new BadRequestException('Cannot delete section with existing students');
    }

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    return { message: 'Section deleted successfully' };
  }
}
