import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  markAttendance(@Body() dto: MarkAttendanceDto, @Req() req: { user: RequestUser }) {
    return this.attendanceService.markAttendance(req.user.schoolId, req.user.sub, req.user.role, dto);
  }

  @Get('section/:sectionId/date/:date')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  getAttendanceBySectionAndDate(
    @Req() req: { user: RequestUser },
    @Param('sectionId') sectionId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getAttendanceBySectionAndDate(
      req.user.schoolId,
      sectionId,
      date,
    );
  }

  @Get('section/:sectionId')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiQuery({ name: 'date', required: false, description: 'Filter by specific date' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceBySection(
    @Req() req: { user: RequestUser },
    @Param('sectionId') sectionId: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getAttendanceBySection(
      req.user.schoolId,
      sectionId,
      date,
      startDate,
      endDate,
    );
  }

  @Get('student/:studentId')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PARENT)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceByStudent(
    @Req() req: { user: RequestUser },
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getAttendanceByStudent(
      req.user.schoolId,
      studentId,
      startDate,
      endDate,
    );
  }

  @Get('my-children')
  @Roles(Role.PARENT)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getMyChildrenAttendance(
    @Req() req: { user: RequestUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getMyChildrenAttendance(
      req.user.schoolId,
      req.user.sub,
      startDate,
      endDate,
    );
  }
}

