import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { SchoolId } from '../../common/decorators/school-id.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('students')
@UseGuards(JwtAuthGuard, SchoolScopeGuard)
export class StudentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@SchoolId() schoolId?: string) {
    // For non-super-admin users, schoolId is forced.
    // For SUPER_ADMIN, schoolId may be undefined unless they provide x-school-id.
    if (!schoolId) return []; // or throw if you want strict admin behavior
    return this.prisma.student.findMany({ where: { schoolId } });
  }
}
