import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  create(@Body() dto: CreateTeacherDto, @Req() req: { user: RequestUser }) {
    return this.teachersService.create(req.user.schoolId, dto);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Req() req: { user: RequestUser }, @Query('includeInactive') includeInactive?: string) {
    return this.teachersService.findAll(req.user.schoolId, includeInactive === 'true');
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  findOne(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.teachersService.findOne(req.user.schoolId, id);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN)
  update(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(req.user.schoolId, id, dto);
  }

  @Put(':id/activate')
  @Roles(Role.SCHOOL_ADMIN)
  activate(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.teachersService.activate(req.user.schoolId, id);
  }

  @Put(':id/deactivate')
  @Roles(Role.SCHOOL_ADMIN)
  deactivate(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.teachersService.deactivate(req.user.schoolId, id);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN)
  delete(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.teachersService.delete(req.user.schoolId, id);
  }
}
