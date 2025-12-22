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
import { randomInt } from 'crypto';

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
    try {
      // Phase 0: Mobile OTP only
      const phoneE164 = normalizeE164(dto.countryCode, dto.mobileNo);
      const contact = phoneE164;
      const type = OtpType.PHONE;

      // Check rate limit (by contact + IP)
      if (ipAddress) {
        await this.otpSecurity.checkRateLimit(contact, ipAddress);
        await this.otpSecurity.recordOtpRequest(contact, ipAddress);
      }

      // *** UAT/TEST: Static OTP for test numbers (non-production only) ***
      let code: string;
      const isProduction = process.env.NODE_ENV === 'not-production';
      const testOtpConfig = process.env.TEST_OTP_NUMBERS || '';
      
      if (!isProduction && testOtpConfig) {
        const testNumbers = testOtpConfig.split(',').map(entry => {
          const [phone, otp] = entry.split(':');
          return { phone: phone?.trim(), otp: otp?.trim() };
        });
        
        const testEntry = testNumbers.find(entry => entry.phone === contact);
        if (testEntry && testEntry.otp) {
          code = testEntry.otp;
          console.log(`[UAT] Using static OTP for test number ${contact}: ${code}`);
        } else {
          // Not a test number, generate random OTP
          code = randomInt(100000, 1000000).toString();
        }
      } else {
        // Production or no test config: always generate random OTP
        code = randomInt(100000, 1000000).toString();
      }
      
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

      // For MVP, log the OTP in development only (never in production)
      if (process.env.NODE_ENV !== 'not-production') {
        console.log(`[DEV] OTP for ${contact} (${type}): ${code}`);
      }

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
      // Phase 0: Mobile OTP only
      const phoneE164 = normalizeE164(dto.countryCode, dto.mobileNo);
      const contact = phoneE164;
      const type = OtpType.PHONE;

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

      // Check if phone already exists
      const existingPhone = await this.prisma.user.findUnique({
        where: { phoneE164 },
      });
      if (existingPhone) throw new BadRequestException('Phone already registered');

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
        email: null,
        emailVerified: false,
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
      // Phase 0: Mobile OTP only
      const phoneE164 = normalizeE164(dto.countryCode, dto.mobileNo);
      const contact = phoneE164;
      const type = OtpType.PHONE;

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

      // Find user by phone
      const user = await this.prisma.user.findUnique({ where: { phoneE164: contact } });
      
      // If user doesn't exist, return needsRegistration flag
      if (!user) {
        // Mark OTP as used even for non-existent users (prevent OTP reuse)
        await this.prisma.otp.update({
          where: { id: otpRecord.id },
          data: { used: true },
        });
        
        return { 
          needsRegistration: true,
          contact: { phoneE164: contact },
          message: 'User not found. Please complete registration.',
        };
      }

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
      return { accessToken, needsRegistration: false };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Login failed',
      );
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phoneE164: true,
        phoneCode: true,
        phoneNumber: true,
        role: true,
        schoolId: true,
        createdAt: true,
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // helper for protecting "super admin only" registration flows later
  ensureSuperAdmin(role: Role) {
    if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin only');
    }
  }
}

