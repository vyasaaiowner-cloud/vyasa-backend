import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Role } from '@prisma/client';
import { normalizeE164 } from '../auth/validators/phone-and-email.validator';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export interface TeacherRow {
  name: string;
  countryCode: string;
  mobileNo: string;
  email?: string;
}

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateTeacherDto) {
    const phoneE164 = normalizeE164(dto.countryCode, dto.mobileNo);
    const email = dto.email?.toLowerCase();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Check if user already exists
        let user = await tx.user.findFirst({
          where: {
            OR: [
              { phoneE164 },
              ...(email ? [{ email }] : []),
            ],
          },
        });

        // Create user if doesn't exist
        if (!user) {
          user = await tx.user.create({
            data: {
              phoneE164,
              phoneCode: dto.countryCode.startsWith('+') ? dto.countryCode : '+' + dto.countryCode,
              phoneNumber: dto.mobileNo,
              email,
              emailVerified: false,
              name: dto.name.trim(),
              role: Role.TEACHER,
              schoolId,
            },
          });
        } else {
          // Verify user belongs to same school
          if (user.schoolId !== schoolId) {
            throw new BadRequestException('Teacher belongs to a different school');
          }
          // Verify user is a teacher
          if (user.role !== Role.TEACHER) {
            throw new BadRequestException('User exists but is not a teacher');
          }
        }

        // Check if teacher profile already exists
        const existingTeacher = await tx.teacher.findUnique({
          where: { userId: user.id },
        });

        if (existingTeacher) {
          throw new BadRequestException('Teacher already exists');
        }

        // Create teacher profile
        const teacher = await tx.teacher.create({
          data: {
            userId: user.id,
            schoolId,
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneE164: true,
                phoneCode: true,
                phoneNumber: true,
              },
            },
          },
        });

        // Assign sections if provided
        if (dto.sectionIds && dto.sectionIds.length > 0) {
          // Verify all sections belong to this school
          const sections = await tx.section.findMany({
            where: {
              id: { in: dto.sectionIds },
              schoolId,
            },
          });

          if (sections.length !== dto.sectionIds.length) {
            throw new BadRequestException('One or more sections not found in this school');
          }

          await tx.teacherAssignment.createMany({
            data: dto.sectionIds.map((sectionId) => ({
              teacherId: teacher.id,
              sectionId,
            })),
          });
        }

        // Fetch complete teacher data with assignments
        return await tx.teacher.findUnique({
          where: { id: teacher.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneE164: true,
                phoneCode: true,
                phoneNumber: true,
              },
            },
            assignments: {
              include: {
                section: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        });
      });
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e?.code === 'P2002') {
        throw new BadRequestException('Teacher with this phone/email already exists');
      }
      throw e;
    }
  }

  async findAll(schoolId: string, includeInactive = false) {
    const where: any = { schoolId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.teacher.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneE164: true,
            phoneCode: true,
            phoneNumber: true,
          },
        },
        assignments: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });
  }

  async findOne(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneE164: true,
            phoneCode: true,
            phoneNumber: true,
          },
        },
        assignments: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async update(schoolId: string, teacherId: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (dto.sectionIds !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        // Verify all sections belong to this school
        if (dto.sectionIds!.length > 0) {
          const sections = await tx.section.findMany({
            where: {
              id: { in: dto.sectionIds },
              schoolId,
            },
          });

          if (sections.length !== dto.sectionIds!.length) {
            throw new BadRequestException('One or more sections not found in this school');
          }
        }

        // Remove all existing assignments
        await tx.teacherAssignment.deleteMany({
          where: { teacherId },
        });

        // Create new assignments
        if (dto.sectionIds!.length > 0) {
          await tx.teacherAssignment.createMany({
            data: dto.sectionIds!.map((sectionId) => ({
              teacherId,
              sectionId,
            })),
          });
        }
      });
    }

    return this.findOne(schoolId, teacherId);
  }

  async activate(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { isActive: true },
    });

    return { message: 'Teacher activated successfully' };
  }

  async deactivate(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { isActive: false },
    });

    return { message: 'Teacher deactivated successfully' };
  }

  async delete(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Delete teacher profile (cascade will delete assignments)
    await this.prisma.teacher.delete({
      where: { id: teacherId },
    });

    return { message: 'Teacher deleted successfully' };
  }

  async getDashboardStats(schoolId: string, userId: string) {
    // Get teacher profile
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        assignments: {
          include: {
            section: {
              include: {
                class: true,
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    // Calculate total students across all assigned sections
    const totalStudents = teacher.assignments.reduce(
      (sum, assignment) => sum + assignment.section._count.students,
      0,
    );

    // Get unique classes
    const uniqueClasses = new Set(
      teacher.assignments.map((assignment) => assignment.section.class.id),
    );

    // Get section details
    const sections = teacher.assignments.map((assignment) => ({
      id: assignment.section.id,
      name: assignment.section.name,
      className: assignment.section.class.name,
      studentCount: assignment.section._count.students,
    }));

    return {
      totalStudents,
      totalSections: teacher.assignments.length,
      totalClasses: uniqueClasses.size,
      sections,
    };
  }

  async bulkUploadTeachers(file: Express.Multer.File, schoolId: string) {
    const data = this.parseFile(file);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; data: TeacherRow; error: string }>,
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
        if (!row.name || !row.countryCode || !row.mobileNo) {
          throw new Error('name, countryCode, and mobileNo are required fields');
        }

        // Normalize phone number
        const phoneE164 = normalizeE164(row.countryCode, row.mobileNo);
        const email = row.email?.toLowerCase();

        // Create or find user
        let user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { phoneE164 },
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (!user) {
          // Create new user
          user = await this.prisma.user.create({
            data: {
              phoneE164,
              phoneCode: row.countryCode.startsWith('+') ? row.countryCode : '+' + row.countryCode,
              phoneNumber: row.mobileNo,
              email,
              emailVerified: false,
              name: row.name.trim(),
              role: Role.TEACHER,
              schoolId,
            },
          });
        } else {
          // Verify user belongs to same school
          if (user.schoolId !== schoolId) {
            throw new Error('Teacher belongs to a different school');
          }
          // Verify user is a teacher
          if (user.role !== Role.TEACHER) {
            throw new Error('User exists but is not a teacher');
          }
        }

        // Check if teacher profile already exists
        const existingTeacher = await this.prisma.teacher.findUnique({
          where: { userId: user.id },
        });

        if (existingTeacher) {
          throw new Error('Teacher already exists');
        }

        // Create teacher profile
        await this.prisma.teacher.create({
          data: {
            userId: user.id,
            schoolId,
            isActive: true,
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

  private parseFile(file: Express.Multer.File): TeacherRow[] {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv') {
        const records = parse(file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        return records as TeacherRow[];
      } else if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json<TeacherRow>(
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
