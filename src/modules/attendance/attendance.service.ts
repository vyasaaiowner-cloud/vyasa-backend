import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(schoolId: string, userId: string, userRole: Role, dto: MarkAttendanceDto) {
    const attendanceDate = new Date(dto.date);
    attendanceDate.setHours(0, 0, 0, 0); // Normalize to start of day

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify section exists and belongs to school
        const section = await tx.section.findFirst({
          where: {
            id: dto.sectionId,
            schoolId,
          },
          include: {
            class: true,
          },
        });

        if (!section) {
          throw new BadRequestException('Section not found in this school');
        }

        // *** ENFORCE TEACHER ASSIGNMENT ***
        // Only teachers need to be assigned to sections
        // School admins can mark attendance for any section
        if (userRole === Role.TEACHER) {
          const teacher = await tx.teacher.findUnique({
            where: { userId },
            select: { id: true },
          });

          if (!teacher) {
            throw new ForbiddenException('Teacher profile not found');
          }

          const assignment = await tx.teacherAssignment.findUnique({
            where: {
              teacherId_sectionId: {
                teacherId: teacher.id,
                sectionId: dto.sectionId,
              },
            },
          });

          if (!assignment) {
            throw new ForbiddenException(
              'You are not assigned to this section. Please contact your administrator.',
            );
          }
        }

        // *** DB-LEVEL ENFORCEMENT: Try to create tracking record ***
        // This will fail with a unique constraint violation if attendance
        // for this section/date already exists, preventing race conditions
        await tx.sectionAttendanceRecord.create({
          data: {
            sectionId: dto.sectionId,
            date: attendanceDate,
            schoolId,
            markedBy: userId,
          },
        });

        // Verify all students belong to this section and school
        const students = await tx.student.findMany({
          where: {
            id: { in: dto.attendances.map((a) => a.studentId) },
            schoolId,
            sectionId: dto.sectionId,
          },
        });

        if (students.length !== dto.attendances.length) {
          throw new BadRequestException(
            'One or more students not found in this section',
          );
        }

        // Create attendance records
        await tx.attendance.createMany({
          data: dto.attendances.map((attendance) => ({
            studentId: attendance.studentId,
            date: attendanceDate,
            status: attendance.status,
            schoolId,
          })),
        });

        return {
          message: 'Attendance marked successfully',
          date: attendanceDate,
          className: section.class.name,
          section: section.name,
          count: dto.attendances.length,
        };
      });
    } catch (error: any) {
      // Handle unique constraint violation from concurrent requests
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Attendance already marked for one or more students on this date',
        );
      }
      throw error;
    }
  }

  async getAttendanceBySection(
    schoolId: string,
    sectionId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      schoolId,
      student: {
        sectionId,
      },
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            class: {
              select: {
                name: true,
              },
            },
            section: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { student: { rollNo: 'asc' } },
      ],
    });

    return attendance;
  }

  async getAttendanceByStudent(
    schoolId: string,
    studentId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify student belongs to this school
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        class: true,
        section: true,
      },
    });

    if (!student) {
      throw new BadRequestException('Student not found in this school');
    }

    const where: any = {
      schoolId,
      studentId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            class: {
              select: {
                name: true,
              },
            },
            section: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return {
      student,
      attendance,
    };
  }

  async getMyChildrenAttendance(
    schoolId: string,
    parentId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Get all children of this parent
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: {
        parentId,
        student: {
          schoolId,
        },
      },
      include: {
        student: {
          include: {
            class: true,
            section: true,
          },
        },
      },
    });

    const studentIds = parentLinks.map((link) => link.studentId);

    if (studentIds.length === 0) {
      return [];
    }

    const where: any = {
      schoolId,
      studentId: { in: studentIds },
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            class: {
              select: {
                name: true,
              },
            },
            section: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { student: { name: 'asc' } },
      ],
    });

    return attendance;
  }
}

