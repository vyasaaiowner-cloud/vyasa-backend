import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Register or update a trusted device for a user
   */
  async registerDevice(
    userId: string,
    deviceId: string,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const deviceToken = this.generateDeviceToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    // Check if device already exists
    const existingDevice = await this.prisma.trustedDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (existingDevice) {
      // Update existing device
      await this.prisma.trustedDevice.update({
        where: { id: existingDevice.id },
        data: {
          deviceToken,
          lastUsedAt: new Date(),
          expiresAt,
          ipAddress,
          userAgent,
        },
      });
      
      this.logger.log(`Updated trusted device for user ${userId}`);
    } else {
      // Create new trusted device
      await this.prisma.trustedDevice.create({
        data: {
          userId,
          deviceId,
          deviceName,
          deviceToken,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });
      
      this.logger.log(`Registered new trusted device for user ${userId}`);
    }

    return deviceToken;
  }

  /**
   * Verify if a device is trusted and valid
   */
  async verifyDevice(
    userId: string,
    deviceId: string,
    deviceToken: string,
  ): Promise<boolean> {
    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        deviceId,
        deviceToken,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (device) {
      // Update last used timestamp
      await this.prisma.trustedDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      });
      
      return true;
    }

    return false;
  }

  /**
   * Get all trusted devices for a user
   */
  async getUserDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });
  }

  /**
   * Remove a trusted device
   */
  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const result = await this.prisma.trustedDevice.deleteMany({
      where: {
        userId,
        deviceId,
      },
    });

    return result.count > 0;
  }

  /**
   * Remove all devices for a user (useful for logout from all devices)
   */
  async removeAllUserDevices(userId: string): Promise<number> {
    const result = await this.prisma.trustedDevice.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  /**
   * Clean up expired devices (can be run as a cron job)
   */
  async cleanupExpiredDevices(): Promise<number> {
    const result = await this.prisma.trustedDevice.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired devices`);
    return result.count;
  }

  /**
   * Generate a secure device token
   */
  private generateDeviceToken(): string {
    return randomBytes(32).toString('hex');
  }
}
