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
import {
  normalizeE164,
  normalizeEmail,
  getContact,
  getContactType,
} from './validators/phone-and-email.validator';
import { OtpSecurityService } from './services/otp-security.service';

// Recommended: keep SUPER_ADMIN inside a "platform" school for DB integrity + easy scoping.
// Create this School once (seed/migration/manual):
// id: "platform", code: "VYASA_PLATFORM", name: "VyasaAI Platform"
const PLATFORM_SCHOOL_ID = 'platform';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otpSecurity: OtpSecurityService,
  ) {}

  async sendOtp(dto: SendOtpDto, ipAddress?: string) {
    // Normalize inputs
    try {
      // Validate: either email OR phone (not both, not neither)
      const hasEmail = !!dto.email && dto.email.trim() !== '';
      const hasPhone = !!dto.countryCode && !!dto.mobileNo;

      if (!hasEmail && !hasPhone) {
        throw new BadRequestException('Either email or phone must be provided');
      }

      if (hasEmail && hasPhone) {
        throw new BadRequestException('Provide either email or phone, not both');
      }

      const email = normalizeEmail(dto.email);
      const phoneE164 = hasPhone ? normalizeE164(dto.countryCode!, dto.mobileNo!) : null;
      const contact = email || phoneE164!;
      const type = getContactType(dto.email);

      // Check rate limit (by contact + IP)
      if (ipAddress) {
        await this.otpSecurity.checkRateLimit(contact, ipAddress);
        await this.otpSecurity.recordOtpRequest(contact, ipAddress);
      }

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
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid input',
      );
    }
  }

  async register(dto: RegisterDto) {
    try {
      // Validate: either email OR phone (not both, not neither)
      const hasEmail = !!dto.email && dto.email.trim() !== '';
      const hasPhone = !!dto.countryCode && !!dto.mobileNo;

      if (!hasEmail && !hasPhone) {
        throw new BadRequestException('Either email or phone must be provided');
      }

      if (hasEmail && hasPhone) {
        throw new BadRequestException('Provide either email or phone, not both');
      }

      // Normalize inputs
      const email = normalizeEmail(dto.email);
      const phoneE164 = hasPhone ? normalizeE164(dto.countryCode!, dto.mobileNo!) : null;
      const contact = email || phoneE164!;
      const type = getContactType(dto.email);

      // Verify OTP
      const otpRecord = await this.prisma.otp.findFirst({
        where: { contact, type, used: false },
      });

      if (!otpRecord) {
        throw new BadRequestException('OTP not found or expired');
      }

      if (otpRecord.expiresAt < new Date()) {
        throw new BadRequestException('OTP expired');
      }

      // Check attempt limit before verifying
      await this.otpSecurity.checkAttemptLimit(otpRecord.id);

      // Verify OTP code
      const isValidOtp = await bcrypt.compare(dto.otp, otpRecord.codeHash);
      if (!isValidOtp) {
        await this.otpSecurity.recordFailedAttempt(otpRecord.id);
        throw new BadRequestException('Invalid OTP');
      }

      // Check if phone already exists (only when phone flow)
      if (phoneE164) {
        const existingPhone = await this.prisma.user.findUnique({
          where: { phoneE164 },
        });
        if (existingPhone) throw new BadRequestException('Phone already exists');
      }

      // Only check email if provided
      if (email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email },
        });
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

    // Extract phone parts (only if phone flow)
    const phoneCode = phoneE164 && dto.countryCode
      ? (dto.countryCode.startsWith('+') ? dto.countryCode : '+' + dto.countryCode)
      : null;
    const phoneNumber = phoneE164 ? dto.mobileNo! : null;

    const user = await this.prisma.user.create({
      data: {
        phoneE164,
        phoneCode,
        phoneNumber,
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
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Registration failed',
      );
    }
  }

  async login(dto: LoginDto, ipAddress?: string) {
    try {
      // Validate: either email OR phone (not both, not neither)
      const hasEmail = !!dto.email && dto.email.trim() !== '';
      const hasPhone = !!dto.countryCode && !!dto.mobileNo;

      if (!hasEmail && !hasPhone) {
        throw new BadRequestException('Either email or phone must be provided');
      }

      if (hasEmail && hasPhone) {
        throw new BadRequestException('Provide either email or phone, not both');
      }

      // Normalize inputs
      const email = normalizeEmail(dto.email);
      const phoneE164 = hasPhone ? normalizeE164(dto.countryCode!, dto.mobileNo!) : null;
      const contact = email || phoneE164!;
      const type = getContactType(dto.email);

      // Verify OTP
      const otpRecord = await this.prisma.otp.findFirst({
        where: { contact, type, used: false },
      });

      if (!otpRecord) throw new UnauthorizedException('OTP not found or expired');

      if (otpRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('OTP expired');
      }

      // Check attempt limit before verifying
      await this.otpSecurity.checkAttemptLimit(otpRecord.id);

      // Verify OTP code
      const isValidOtp = await bcrypt.compare(dto.otp, otpRecord.codeHash);
      if (!isValidOtp) {
        await this.otpSecurity.recordFailedAttempt(otpRecord.id);
        throw new UnauthorizedException('Invalid OTP');
      }

      // Find user by phone or email based on type
      const user = type === OtpType.PHONE
        ? await this.prisma.user.findUnique({ where: { phoneE164: contact } })
        : await this.prisma.user.findUnique({ where: { email: contact } });
      if (!user) throw new UnauthorizedException('User not found');

      // Mark OTP as used
      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });

      const payload = {
        sub: user.id,
        phone: user.phoneE164 || user.email || 'unknown',
        role: user.role,
        schoolId: user.schoolId,
      };

      const accessToken = await this.jwt.signAsync(payload);
      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Login failed',
      );
    }
  }

  // helper for protecting "super admin only" registration flows later
  ensureSuperAdmin(role: Role) {
    if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin only');
    }
  }
}

