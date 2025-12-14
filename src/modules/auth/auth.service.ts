import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { Role } from '@prisma/client';

// Recommended: keep SUPER_ADMIN inside a "platform" school for DB integrity + easy scoping.
// Create this School once (seed/migration/manual):
// id: "platform", code: "VYASA_PLATFORM", name: "VyasaAI Platform"
const PLATFORM_SCHOOL_ID = 'platform';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = dto.phone.trim();

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTPs for this phone
    await this.prisma.otp.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    await this.prisma.otp.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // For MVP, log the OTP instead of sending SMS
    console.log(`OTP for ${phone}: ${code}`);

    return { message: 'OTP sent successfully' };
  }

  async register(dto: RegisterDto) {
    const phone = dto.phone.trim();

    // Verify OTP
    const otpRecord = await this.prisma.otp.findFirst({
      where: { phone, code: dto.otp, used: false },
    });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException('Phone already exists');

    // Enforce schoolId rules
    // - SUPER_ADMIN: auto-assign platform school
    // - Others: must provide schoolId
    const schoolId =
      dto.role === Role.SUPER_ADMIN ? PLATFORM_SCHOOL_ID : dto.schoolId;

    if (dto.role !== Role.SUPER_ADMIN && !schoolId) {
      throw new BadRequestException(
        'schoolId is required for non-super-admin users',
      );
    }

    // Optional but helpful: validate provided schoolId exists (prevents FK errors)
    if (dto.role !== Role.SUPER_ADMIN) {
      const schoolExists = await this.prisma.school.findUnique({
        where: { id: schoolId! },
        select: { id: true },
      });
      if (!schoolExists) throw new BadRequestException('Invalid schoolId');
    }

    // For SUPER_ADMIN, ensure platform school exists (clear error if not)
    if (dto.role === Role.SUPER_ADMIN) {
      const platformExists = await this.prisma.school.findUnique({
        where: { id: PLATFORM_SCHOOL_ID },
        select: { id: true },
      });
      if (!platformExists) {
        throw new BadRequestException(
          `Platform school missing. Create School with id="${PLATFORM_SCHOOL_ID}" (code: "VYASA_PLATFORM").`,
        );
      }
    }

    // Mark OTP as used
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const user = await this.prisma.user.create({
      data: {
        phone,
        email: dto.email.toLowerCase(),
        name: dto.name.trim(),
        role: dto.role,
        schoolId: schoolId!, // ALWAYS string now
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const phone = dto.phone.trim();

    // Verify OTP
    const otpRecord = await this.prisma.otp.findFirst({
      where: { phone, code: dto.otp, used: false },
    });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('User not found');

    // Mark OTP as used
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      schoolId: user.schoolId,
    };

    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken };
  }

  // helper for protecting "super admin only" registration flows later
  ensureSuperAdmin(role: Role) {
    if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin only');
    }
  }
}

