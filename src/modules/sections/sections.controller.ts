import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from '../schools/dto/create-section.dto';
import { UpdateSectionDto } from '../schools/dto/update-section.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('sections')
@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  create(@Body() dto: CreateSectionDto, @Req() req: { user: RequestUser }) {
    return this.sectionsService.create(req.user.schoolId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findAll(@Req() req: { user: RequestUser }, @Query('classId') classId?: string) {
    return this.sectionsService.findAll(req.user.schoolId, classId);
  }

  @Get(':sectionId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Req() req: { user: RequestUser }, @Param('sectionId') sectionId: string) {
    return this.sectionsService.findOne(req.user.schoolId, sectionId);
  }

  @Patch(':sectionId')
  @Roles(Role.SCHOOL_ADMIN)
  update(
    @Req() req: { user: RequestUser },
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(req.user.schoolId, sectionId, dto);
  }

  @Delete(':sectionId')
  @Roles(Role.SCHOOL_ADMIN)
  delete(@Req() req: { user: RequestUser }, @Param('sectionId') sectionId: string) {
    return this.sectionsService.delete(req.user.schoolId, sectionId);
  }
}
