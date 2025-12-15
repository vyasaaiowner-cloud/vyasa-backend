import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('schools')
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  // Class endpoints
  @Post('classes')
  @Roles(Role.SCHOOL_ADMIN)
  createClass(@Body() dto: CreateClassDto, @Req() req: { user: RequestUser }) {
    return this.schoolsService.createClass(req.user.schoolId, dto);
  }

  @Get('classes')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  getClasses(@Req() req: { user: RequestUser }) {
    return this.schoolsService.getClasses(req.user.schoolId);
  }

  @Get('classes/:classId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  getClass(@Req() req: { user: RequestUser }, @Param('classId') classId: string) {
    return this.schoolsService.getClass(req.user.schoolId, classId);
  }

  @Patch('classes/:classId')
  @Roles(Role.SCHOOL_ADMIN)
  updateClass(
    @Req() req: { user: RequestUser },
    @Param('classId') classId: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.schoolsService.updateClass(req.user.schoolId, classId, dto);
  }

  @Delete('classes/:classId')
  @Roles(Role.SCHOOL_ADMIN)
  deleteClass(@Req() req: { user: RequestUser }, @Param('classId') classId: string) {
    return this.schoolsService.deleteClass(req.user.schoolId, classId);
  }

  // Section endpoints
  @Post('sections')
  @Roles(Role.SCHOOL_ADMIN)
  createSection(@Body() dto: CreateSectionDto, @Req() req: { user: RequestUser }) {
    return this.schoolsService.createSection(req.user.schoolId, dto);
  }

  @Get('sections')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  getSections(@Req() req: { user: RequestUser }, @Query('classId') classId?: string) {
    return this.schoolsService.getSections(req.user.schoolId, classId);
  }

  @Get('sections/:sectionId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  getSection(@Req() req: { user: RequestUser }, @Param('sectionId') sectionId: string) {
    return this.schoolsService.getSection(req.user.schoolId, sectionId);
  }

  @Patch('sections/:sectionId')
  @Roles(Role.SCHOOL_ADMIN)
  updateSection(
    @Req() req: { user: RequestUser },
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.schoolsService.updateSection(req.user.schoolId, sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @Roles(Role.SCHOOL_ADMIN)
  deleteSection(@Req() req: { user: RequestUser }, @Param('sectionId') sectionId: string) {
    return this.schoolsService.deleteSection(req.user.schoolId, sectionId);
  }
}
