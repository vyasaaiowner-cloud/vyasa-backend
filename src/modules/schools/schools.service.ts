import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    const schoolCode = dto.code.trim().toUpperCase();
    const adminEmail = dto.adminEmail.toLowerCase();

    // generate temp password
    const tempPassword = `Admin@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

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
            password: hashedPassword,
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
          temporaryPassword: tempPassword, // show ONCE
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
