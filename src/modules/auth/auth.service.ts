import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already exists');

    // For MVP: Only SCHOOL_ADMIN/TEACHER/PARENT should have schoolId
    if (dto.role !== Role.SUPER_ADMIN && !dto.schoolId) {
      throw new BadRequestException('schoolId is required for non-super-admin users');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hash,
        role: dto.role,
        schoolId: dto.role === Role.SUPER_ADMIN ? null : dto.schoolId!,
      },
      select: { id: true, email: true, role: true, schoolId: true, createdAt: true },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };

    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken };
  }

  // helper for protecting “super admin only” registration flows later
  ensureSuperAdmin(role: Role) {
    if (role !== Role.SUPER_ADMIN) throw new ForbiddenException('Super admin only');
  }
}
