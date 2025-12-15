import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { Role } from '@prisma/client';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    const schoolCode = dto.code.trim().toUpperCase();
    const adminEmail = dto.adminEmail.toLowerCase();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1️⃣ Create school
        const school = await tx.school.create({
          data: {
            name: dto.name.trim(),
            code: schoolCode,
          },
        });

        // 2️⃣ Create first SCHOOL_ADMIN
        const phoneE164 = dto.adminPhoneCode + dto.adminPhoneNumber;
        const adminUser = await tx.user.create({
          data: {
            phoneE164,
            phoneCode: dto.adminPhoneCode,
            phoneNumber: dto.adminPhoneNumber,
            email: adminEmail,
            emailVerified: false,
            name: dto.adminName.trim(),
            role: Role.SCHOOL_ADMIN,
            schoolId: school.id,
          },
        });

        return { school, adminUser };
      });

      return {
        school: result.school,
        schoolAdmin: {
          email: adminEmail,
        },
        message: 'School and School Admin created successfully',
      };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          'School code or admin email already exists',
        );
      }
      throw e;
    }
  }

  // Class CRUD
  async createClass(schoolId: string, dto: CreateClassDto) {
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

  async getClasses(schoolId: string) {
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

  async getClass(schoolId: string, classId: string) {
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

  async updateClass(schoolId: string, classId: string, dto: UpdateClassDto) {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    try {
      return await this.prisma.class.update({
        where: { id: classId },
        data: { name: dto.name.trim() },
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

  async deleteClass(schoolId: string, classId: string) {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    return { message: 'Class deleted successfully' };
  }

  // Section CRUD
  async createSection(schoolId: string, dto: CreateSectionDto) {
    // Verify class belongs to school
    const classData = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    });

    if (!classData) {
      throw new BadRequestException('Class not found in this school');
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

  async getSections(schoolId: string, classId?: string) {
    const where: any = { schoolId };
    if (classId) {
      where.classId = classId;
    }

    return this.prisma.section.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSection(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: {
        class: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async updateSection(schoolId: string, sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    try {
      return await this.prisma.section.update({
        where: { id: sectionId },
        data: { name: dto.name.trim() },
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

  async deleteSection(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    return { message: 'Section deleted successfully' };
  }
}
