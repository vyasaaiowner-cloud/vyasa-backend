import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch, Delete } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  create(@Body() dto: CreateAnnouncementDto, @Req() req: { user: RequestUser }) {
    return this.announcementService.create(req.user.schoolId, req.user.sub, dto);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findAll(@Req() req: { user: RequestUser }) {
    return this.announcementService.findAll(req.user.schoolId, req.user.role, req.user.sub);
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.announcementService.findOne(req.user.schoolId, id);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN)
  update(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(req.user.schoolId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN)
  delete(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.announcementService.delete(req.user.schoolId, id);
  }
}
