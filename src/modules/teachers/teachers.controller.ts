import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('dashboard/stats')
  @Roles(Role.TEACHER)
  getDashboardStats(@Req() req: { user: RequestUser }) {
    return this.teachersService.getDashboardStats(req.user.schoolId, req.user.sub);
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

  @Post('bulk-upload')
  @Roles(Role.SCHOOL_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv|xlsx|xls)$/)) {
          return cb(
            new BadRequestException('Only CSV and Excel files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: RequestUser },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.teachersService.bulkUploadTeachers(file, req.user.schoolId);
  }
}
