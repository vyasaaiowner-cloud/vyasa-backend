import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { Role } from '@prisma/client';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    const schoolCode = dto.code.trim().toUpperCase();
    const adminEmail = dto.adminEmail.toLowerCase();
    console.log(dto);
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
        const adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            name: dto.adminName.trim(),
            phoneCode: dto.adminPhoneCode?.trim(),
            phoneNumber: dto.adminPhoneNumber?.trim(),
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
}
