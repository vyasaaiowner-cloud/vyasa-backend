import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolId } from '../../common/decorators/school-id.decorator';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  async create(@Body() body: { title: string; content: string }, @SchoolId() schoolId: string, @Request() req) {
    return this.announcementService.create({ ...body, schoolId, createdBy: req.user.id });
  }

  @Get()
  async findAll(@SchoolId() schoolId: string) {
    return this.announcementService.findAll(schoolId);
  }
}