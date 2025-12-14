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
import { Role, OtpType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    const contact = dto.email || (dto.countryCode + dto.mobileNo);
    const type = dto.email ? OtpType.EMAIL : OtpType.PHONE;

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTPs for this contact
    await this.prisma.otp.updateMany({
      where: { contact, type, used: false },
      data: { used: true },
    });

    await this.prisma.otp.create({
      data: {
        contact,
        type,
        codeHash,
        expiresAt,
      },
    });

    // For MVP, log the OTP instead of sending SMS/Email
    console.log(`OTP for ${contact} (${type}): ${code}`);

    return { message: 'OTP sent successfully' };
  }

  async register(dto: RegisterDto) {
    // Validate: either email or phone must be provided
    if (!dto.email && (!dto.countryCode || !dto.mobileNo)) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const email = dto.email?.toLowerCase();
    const contact = email || (dto.countryCode + dto.mobileNo);
    const type = email ? OtpType.EMAIL : OtpType.PHONE;

    // Verify OTP
    const otpRecord = await this.prisma.otp.findFirst({
      where: { contact, type, used: false },
    });
    if (!otpRecord || otpRecord.expiresAt < new Date() || !(await bcrypt.compare(dto.otp, otpRecord.codeHash))) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const existingPhone = await this.prisma.user.findUnique({ where: { phoneE164: dto.countryCode + dto.mobileNo } });
    if (existingPhone) throw new BadRequestException('Phone already exists');

    // Only check email if provided
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) throw new BadRequestException('Email already exists');
    }

    // Enforce schoolId rules
    // - SUPER_ADMIN: auto-assign platform school
    // - Others: must provide schoolId
    const schoolId =
      dto.role === Role.SUPER_ADMIN ? PLATFORM_SCHOOL_ID : dto.schoolId!;

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

    // For SUPER_ADMIN, ensure platform school exists (create if not)
    if (dto.role === Role.SUPER_ADMIN) {
      const platformExists = await this.prisma.school.findUnique({
        where: { id: PLATFORM_SCHOOL_ID },
        select: { id: true },
      });
      if (!platformExists) {
        await this.prisma.school.create({
          data: {
            id: PLATFORM_SCHOOL_ID,
            name: 'Vyasa Platform',
            code: 'VYASA_PLATFORM',
          },
        });
      }
    }

    // Mark OTP as used
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const user = await this.prisma.user.create({
      data: {
        phoneE164: dto.countryCode + dto.mobileNo,
        phoneCode: dto.countryCode,
        phoneNumber: dto.mobileNo,
        email: email ?? null,
        emailVerified: type === OtpType.EMAIL,
        name: dto.name.trim(),
        role: dto.role,
        schoolId: schoolId, // Required by schema; SUPER_ADMIN auto-assigned to platform school
      },
      select: {
        id: true,
        phoneE164: true,
        phoneCode: true,
        phoneNumber: true,
        email: true,
        emailVerified: true,
        name: true,
        role: true,
        schoolId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    // Validate: either email or phone must be provided
    if (!dto.email && (!dto.countryCode || !dto.mobileNo)) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const email = dto.email?.toLowerCase();
    const contact = email || (dto.countryCode + dto.mobileNo);
    const type = email ? OtpType.EMAIL : OtpType.PHONE;

    // Verify OTP
    const otpRecord = await this.prisma.otp.findFirst({
      where: { contact, type, used: false },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date() || !(await bcrypt.compare(dto.otp, otpRecord.codeHash))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find user by phone or email based on type
    const user = otpRecord.type === OtpType.PHONE
      ? await this.prisma.user.findUnique({ where: { phoneE164: contact } })
      : await this.prisma.user.findUnique({ where: { email: contact.toLowerCase() } });
    if (!user) throw new UnauthorizedException('User not found');

    // Mark OTP as used
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const payload = {
      sub: user.id,
      phone: user.phoneCode + user.phoneNumber,
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

