import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role } from '@prisma/client';
import { normalizeE164 } from '../auth/validators/phone-and-email.validator';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateStudentDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify class and section exist and belong to school
        const section = await tx.section.findFirst({
          where: {
            id: dto.sectionId,
            classId: dto.classId,
            schoolId,
          },
          include: {
            class: true,
          },
        });

        if (!section) {
          throw new BadRequestException('Section not found or does not belong to this class/school');
        }

        // Create student
        const student = await tx.student.create({
          data: {
            name: dto.name.trim(),
            classId: dto.classId,
            sectionId: dto.sectionId,
            rollNo: dto.rollNo ?? null,
            schoolId,
          },
        });

        // Create parent if provided
        if (dto.parentMobileNo && dto.parentCountryCode && dto.parentName) {
          const phoneE164 = normalizeE164(dto.parentCountryCode, dto.parentMobileNo);
          const email = dto.parentEmail?.toLowerCase();

          // Check if parent user exists
          let parent = await tx.user.findFirst({
            where: {
              OR: [
                { phoneE164 },
                ...(email ? [{ email }] : []),
              ],
            },
          });

          // Create parent user if doesn't exist
          if (!parent) {
            parent = await tx.user.create({
              data: {
                phoneE164,
                phoneCode: dto.parentCountryCode.startsWith('+') 
                  ? dto.parentCountryCode 
                  : '+' + dto.parentCountryCode,
                phoneNumber: dto.parentMobileNo,
                email,
                emailVerified: false,
                name: dto.parentName.trim(),
                role: Role.PARENT,
                schoolId,
              },
            });
          } else {
            // Verify parent belongs to same school
            if (parent.schoolId !== schoolId) {
              throw new BadRequestException('Parent belongs to a different school');
            }
            // Verify user is a parent
            if (parent.role !== Role.PARENT) {
              throw new BadRequestException('User exists but is not a parent');
            }
          }

          // Link parent to student
          await tx.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: student.id,
            },
          });
        }

        // Return complete student data
        return await tx.student.findUnique({
          where: { id: student.id },
          include: {
            parents: {
              include: {
                parent: {
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
            },
          },
        });
      });
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          'Student with this roll number already exists in this class/section',
        );
      }
      throw e;
    }
  }

  async findAll(schoolId: string, classId?: string, sectionId?: string) {
    const where: any = { schoolId };
    if (classId) {
      where.classId = classId;
    }
    if (sectionId) {
      where.sectionId = sectionId;
    }

    return this.prisma.student.findMany({
      where,
      include: {
        class: true,
        section: true,
        parents: {
          include: {
            parent: {
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
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { section: { name: 'asc' } },
        { rollNo: 'asc' },
      ],
    });
  }

  async findOne(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        class: true,
        section: true,
        parents: {
          include: {
            parent: {
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
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(schoolId: string, studentId: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate section if being updated
    if (dto.classId || dto.sectionId) {
      const targetClassId = dto.classId || student.classId;
      const targetSectionId = dto.sectionId || student.sectionId;

      const section = await this.prisma.section.findFirst({
        where: {
          id: targetSectionId,
          classId: targetClassId,
          schoolId,
        },
      });

      if (!section) {
        throw new BadRequestException('Section not found or does not belong to this class/school');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Update student basic info
        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: {
            ...(dto.name && { name: dto.name.trim() }),
            ...(dto.classId && { classId: dto.classId }),
            ...(dto.sectionId && { sectionId: dto.sectionId }),
            ...(dto.rollNo !== undefined && { rollNo: dto.rollNo ?? null }),
          },
        });

        // Handle parent updates if provided
        if (dto.parents && dto.parents.length > 0) {
          // Remove existing parent links
          await tx.parentStudent.deleteMany({
            where: { studentId },
          });

          // Process each parent
          for (const parentInfo of dto.parents) {
            let parentId = parentInfo.parentId;

            // If parentId not provided, create or find parent
            if (!parentId && parentInfo.countryCode && parentInfo.mobileNo && parentInfo.name) {
              const phoneE164 = normalizeE164(parentInfo.countryCode, parentInfo.mobileNo);
              const email = parentInfo.email?.toLowerCase();

              // Check if parent user exists
              let parent = await tx.user.findFirst({
                where: {
                  OR: [
                    { phoneE164 },
                    ...(email ? [{ email }] : []),
                  ],
                },
              });

              // Create parent user if doesn't exist
              if (!parent) {
                parent = await tx.user.create({
                  data: {
                    phoneE164,
                    phoneCode: parentInfo.countryCode.startsWith('+')
                      ? parentInfo.countryCode
                      : '+' + parentInfo.countryCode,
                    phoneNumber: parentInfo.mobileNo,
                    email,
                    emailVerified: false,
                    name: parentInfo.name.trim(),
                    role: Role.PARENT,
                    schoolId,
                  },
                });
              } else {
                // Verify parent belongs to same school
                if (parent.schoolId !== schoolId) {
                  throw new BadRequestException('Parent belongs to a different school');
                }
                // Verify user is a parent
                if (parent.role !== Role.PARENT) {
                  throw new BadRequestException('User exists but is not a parent');
                }
              }

              parentId = parent.id;
            }

            // Link parent to student
            if (parentId) {
              await tx.parentStudent.create({
                data: {
                  parentId,
                  studentId,
                },
              });
            }
          }
        }

        // Return complete student data
        return await tx.student.findUnique({
          where: { id: studentId },
          include: {
            class: true,
            section: true,
            parents: {
              include: {
                parent: {
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
            },
          },
        });
      });
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          'Student with this roll number already exists in this class/section',
        );
      }
      throw e;
    }
  }

  async delete(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.student.delete({
      where: { id: studentId },
    });

    return { message: 'Student deleted successfully' };
  }

  async bulkUploadCSV(schoolId: string, csvBuffer: Buffer) {
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>,
    };

    const rows: any[] = [];

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(csvBuffer.toString());
      stream
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    results.total = rows.length;

    // Cache for class/section lookups to avoid repeated DB queries
    const sectionCache = new Map<string, string>(); // key: "className|sectionName", value: sectionId

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is header and arrays are 0-indexed

      try {
        // Validate required fields
        if (!row.name || !row.className || !row.section || !row.rollNo) {
          throw new Error('Missing required fields: name, className, section, or rollNo');
        }

        // Validate rollNo is a number
        const rollNo = parseInt(row.rollNo);
        if (isNaN(rollNo)) {
          throw new Error('Invalid roll number');
        }

        // Look up or cache section ID
        const cacheKey = `${row.className}|${row.section}`;
        let sectionId = sectionCache.get(cacheKey);

        if (!sectionId) {
          // Find class and section
          const classRecord = await this.prisma.class.findFirst({
            where: {
              name: row.className.trim(),
              schoolId,
            },
          });

          if (!classRecord) {
            throw new Error(`Class "${row.className}" not found`);
          }

          const sectionRecord = await this.prisma.section.findFirst({
            where: {
              name: row.section.trim(),
              classId: classRecord.id,
              schoolId,
            },
          });

          if (!sectionRecord) {
            throw new Error(`Section "${row.section}" not found in class "${row.className}"`);
          }

          sectionId = sectionRecord.id;
          sectionCache.set(cacheKey, sectionId);
        }

        const dto: CreateStudentDto = {
          name: row.name,
          classId: sectionId.split('|')[0], // Get classId from section lookup
          sectionId: sectionId,
          rollNo,
          parentName: row.parentName || undefined,
          parentCountryCode: row.parentCountryCode || undefined,
          parentMobileNo: row.parentMobileNo || undefined,
          parentEmail: row.parentEmail || undefined,
        };

        // Get the actual section to extract classId
        const section = await this.prisma.section.findUnique({
          where: { id: sectionId },
          select: { classId: true },
        });

        dto.classId = section!.classId;

        await this.create(schoolId, dto);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    return results;
  }
}

