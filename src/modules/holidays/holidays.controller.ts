import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../common/types/request-user.type';

@ApiTags('holidays')
@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  // Admin-only: Create a new holiday
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  create(
    @Req() req: { user: RequestUser },
    @Body() createHolidayDto: CreateHolidayDto,
  ) {
    return this.holidaysService.create(req.user.schoolId, createHolidayDto);
  }

  // All authenticated users can view holidays
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findAll(@Req() req: { user: RequestUser }) {
    return this.holidaysService.findAll(req.user.schoolId);
  }

  // All authenticated users can view a single holiday
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.holidaysService.findOne(id, req.user.schoolId);
  }

  // Admin-only: Update a holiday
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  update(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, req.user.schoolId, updateHolidayDto);
  }

  // Admin-only: Delete a holiday
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.holidaysService.remove(id, req.user.schoolId);
  }
}
