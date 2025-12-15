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
    return this.attendanceService.markAttendance(req.user.schoolId, dto);
  }

  @Get('class/:className/section/:section')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceByClass(
    @Req() req: { user: RequestUser },
    @Param('className') className: string,
    @Param('section') section: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getAttendanceByClass(
      req.user.schoolId,
      className,
      section,
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

