import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from '../schools/dto/create-class.dto';
import { UpdateClassDto } from '../schools/dto/update-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  create(@Body() dto: CreateClassDto, @Req() req: { user: RequestUser }) {
    return this.classesService.create(req.user.schoolId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findAll(@Req() req: { user: RequestUser }) {
    return this.classesService.findAll(req.user.schoolId);
  }

  @Get(':classId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Req() req: { user: RequestUser }, @Param('classId') classId: string) {
    return this.classesService.findOne(req.user.schoolId, classId);
  }

  @Patch(':classId')
  @Roles(Role.SCHOOL_ADMIN)
  update(
    @Req() req: { user: RequestUser },
    @Param('classId') classId: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(req.user.schoolId, classId, dto);
  }

  @Delete(':classId')
  @Roles(Role.SCHOOL_ADMIN)
  delete(@Req() req: { user: RequestUser }, @Param('classId') classId: string) {
    return this.classesService.delete(req.user.schoolId, classId);
  }
}
