import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(schoolId: string, dto: MarkAttendanceDto) {
    const attendanceDate = new Date(dto.date);
    attendanceDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Check if attendance already marked for this class/section/date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        schoolId,
        date: attendanceDate,
        student: {
          className: dto.className,
          section: dto.section,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Attendance already marked for this class/section on this date',
      );
    }

    // Verify all students belong to this class/section and school
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: dto.attendances.map((a) => a.studentId) },
        schoolId,
        className: dto.className,
        section: dto.section,
      },
    });

    if (students.length !== dto.attendances.length) {
      throw new BadRequestException(
        'One or more students not found in this class/section',
      );
    }

    // Create attendance records
    await this.prisma.attendance.createMany({
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
      className: dto.className,
      section: dto.section,
      count: dto.attendances.length,
    };
  }

  async getAttendanceByClass(
    schoolId: string,
    className: string,
    section: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      schoolId,
      student: {
        className,
        section,
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
            className: true,
            section: true,
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
            className: true,
            section: true,
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
        student: true,
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
            className: true,
            section: true,
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

