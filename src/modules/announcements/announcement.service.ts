import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  async create(
    schoolId: string,
    userId: string,
    dto: CreateAnnouncementDto,
  ) {
    // Validate targeting logic
    if (!dto.targetAll && !dto.targetClass) {
      throw new BadRequestException(
        'Either targetAll must be true, or targetClass must be provided',
      );
    }

    if (dto.targetAll && (dto.targetClass || dto.targetSection)) {
      throw new BadRequestException(
        'Cannot specify targetClass or targetSection when targetAll is true',
      );
    }

    return this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        targetAll: dto.targetAll,
        targetClass: dto.targetClass?.trim(),
        targetSection: dto.targetSection?.trim(),
        schoolId,
        createdBy: userId,
      },
    });
  }

  async findAll(schoolId: string, userRole: Role, userId: string) {
    // For admins, show all announcements
    if (userRole === Role.SCHOOL_ADMIN || userRole === Role.SUPER_ADMIN) {
      return this.prisma.announcement.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      });
    }

    // For teachers and parents, filter by their relevant class/sections
    if (userRole === Role.TEACHER) {
      // Get teacher's assigned sections
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId },
        include: {
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
        return [];
      }

      // Get unique classes the teacher teaches
      const classNames = [
        ...new Set(
          teacher.assignments.map((a) => a.section.class.name),
        ),
      ];

      return this.prisma.announcement.findMany({
        where: {
          schoolId,
          OR: [
            { targetAll: true },
            { targetClass: { in: classNames } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (userRole === Role.PARENT) {
      // Get parent's children
      const children = await this.prisma.parentStudent.findMany({
        where: {
          parentId: userId,
          student: {
            schoolId,
          },
        },
        include: {
          student: true,
        },
      });

      if (children.length === 0) {
        return [];
      }

      // Get unique classes of children
      const classNames = [...new Set(children.map((c) => c.student.className))];

      return this.prisma.announcement.findMany({
        where: {
          schoolId,
          OR: [
            { targetAll: true },
            { targetClass: { in: classNames } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return [];
  }

  async findOne(schoolId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        schoolId,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async update(
    schoolId: string,
    announcementId: string,
    dto: UpdateAnnouncementDto,
  ) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        schoolId,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Validate targeting logic if being updated
    const newTargetAll = dto.targetAll ?? announcement.targetAll;
    const newTargetClass = dto.targetClass ?? announcement.targetClass;
    const newTargetSection = dto.targetSection ?? announcement.targetSection;

    if (!newTargetAll && !newTargetClass) {
      throw new BadRequestException(
        'Either targetAll must be true, or targetClass must be provided',
      );
    }

    if (newTargetAll && (newTargetClass || newTargetSection)) {
      throw new BadRequestException(
        'Cannot specify targetClass or targetSection when targetAll is true',
      );
    }

    return this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.content && { content: dto.content.trim() }),
        ...(dto.targetAll !== undefined && { targetAll: dto.targetAll }),
        ...(dto.targetClass !== undefined && { 
          targetClass: dto.targetClass ? dto.targetClass.trim() : null 
        }),
        ...(dto.targetSection !== undefined && { 
          targetSection: dto.targetSection ? dto.targetSection.trim() : null 
        }),
      },
    });
  }

  async delete(schoolId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        schoolId,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    await this.prisma.announcement.delete({
      where: { id: announcementId },
    });

    return { message: 'Announcement deleted successfully' };
  }
}
