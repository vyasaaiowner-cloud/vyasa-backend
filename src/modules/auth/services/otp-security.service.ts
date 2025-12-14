import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const OTP_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 5;

@Injectable()
export class OtpSecurityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if contact has exceeded rate limit (by IP)
   * @param contact - Phone number or email
   * @param ipAddress - Client IP address
   * @throws BadRequestException if rate limited
   */
  async checkRateLimit(contact: string, ipAddress: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );

    const rateLimit = await this.prisma.otpRateLimit.findUnique({
      where: { contact_ipAddress: { contact, ipAddress } },
    });

    if (rateLimit && rateLimit.expiresAt > now) {
      if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        throw new BadRequestException(
          `Too many OTP requests. Please try again after ${Math.ceil((rateLimit.expiresAt.getTime() - now.getTime()) / 60000)} minutes`,
        );
      }
    }
  }

  /**
   * Record OTP request for rate limiting
   * @param contact - Phone number or email
   * @param ipAddress - Client IP address
   */
  async recordOtpRequest(contact: string, ipAddress: string): Promise<void> {
    const now = new Date();
    const windowExpiry = new Date(
      now.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );

    await this.prisma.otpRateLimit.upsert({
      where: { contact_ipAddress: { contact, ipAddress } },
      create: {
        contact,
        ipAddress,
        count: 1,
        expiresAt: windowExpiry,
      },
      update: {
        count: { increment: 1 },
        expiresAt: windowExpiry,
      },
    });
  }

  /**
   * Check if OTP has exceeded max verification attempts
   * @param otpId - OTP record ID
   * @throws BadRequestException if max attempts exceeded
   */
  async checkAttemptLimit(otpId: string): Promise<void> {
    const otp = await this.prisma.otp.findUnique({ where: { id: otpId } });

    if (!otp) {
      throw new BadRequestException('OTP not found');
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      // Invalidate the OTP
      await this.prisma.otp.update({
        where: { id: otpId },
        data: { used: true },
      });
      throw new BadRequestException(
        'Maximum OTP verification attempts exceeded. Please request a new OTP',
      );
    }
  }

  /**
   * Record a failed OTP verification attempt
   * @param otpId - OTP record ID
   */
  async recordFailedAttempt(otpId: string): Promise<void> {
    await this.prisma.otp.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  /**
   * Reset rate limit for contact-IP pair (e.g., after successful registration)
   * @param contact - Phone number or email
   * @param ipAddress - Client IP address
   */
  async resetRateLimit(contact: string, ipAddress: string): Promise<void> {
    await this.prisma.otpRateLimit.deleteMany({
      where: { contact, ipAddress },
    });
  }

  /**
   * Clean up expired rate limit records (call periodically)
   */
  async cleanupExpiredRateLimits(): Promise<void> {
    await this.prisma.otpRateLimit.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
