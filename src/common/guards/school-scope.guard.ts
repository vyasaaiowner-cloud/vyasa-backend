import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class SchoolScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) return false;

    // If user belongs to a school, force that schoolId (tenant lock)
    if (user.role !== Role.SUPER_ADMIN) {
      if (!user.schoolId) throw new BadRequestException('User has no schoolId assigned.');
      req.schoolId = user.schoolId;
      return true;
    }

    // SUPER_ADMIN can specify school context through header or query param
    const headerSchoolId = req.headers['x-school-id'];
    const querySchoolId = req.query?.schoolId;

    const schoolId = (headerSchoolId || querySchoolId) as string | undefined;
    if (!schoolId) {
      // allow super admin routes that don't need school scope
      req.schoolId = undefined;
      return true;
    }

    req.schoolId = schoolId;
    return true;
  }
}
