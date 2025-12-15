import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  create(@Body() dto: CreateStudentDto, @Req() req: { user: RequestUser }) {
    return this.studentsService.create(req.user.schoolId, dto);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  findAll(
    @Req() req: { user: RequestUser },
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.studentsService.findAll(req.user.schoolId, classId, sectionId);
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.studentsService.findOne(req.user.schoolId, id);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN)
  update(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(req.user.schoolId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN)
  delete(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.studentsService.delete(req.user.schoolId, id);
  }

  @Post('bulk-upload')
  @Roles(Role.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async bulkUpload(
    @Req() req: { user: RequestUser },
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.studentsService.bulkUploadCSV(req.user.schoolId, file.buffer);
  }
}
