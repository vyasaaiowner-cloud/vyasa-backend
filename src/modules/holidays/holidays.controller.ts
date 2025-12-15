import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolId } from '../../common/decorators/school-id.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('holidays')
@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolScopeGuard)
@ApiBearerAuth('access-token')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  // Admin-only: Create a new holiday
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  create(
    @SchoolId() schoolId: string,
    @Body() createHolidayDto: CreateHolidayDto,
  ) {
    return this.holidaysService.create(schoolId, createHolidayDto);
  }

  // All authenticated users can view holidays
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findAll(@SchoolId() schoolId: string) {
    return this.holidaysService.findAll(schoolId);
  }

  // All authenticated users can view a single holiday
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.holidaysService.findOne(id, schoolId);
  }

  // Admin-only: Update a holiday
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  update(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, schoolId, updateHolidayDto);
  }

  // Admin-only: Delete a holiday
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  remove(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.holidaysService.remove(id, schoolId);
  }
}
