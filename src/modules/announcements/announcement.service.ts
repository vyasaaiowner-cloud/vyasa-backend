import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  async create(data: { title: string; content: string; schoolId: string; createdBy: string }) {
    return this.prisma.announcement.create({ data });
  }

  async findAll(schoolId: string) {
    return this.prisma.announcement.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } });
  }
}