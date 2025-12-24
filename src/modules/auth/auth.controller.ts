import { Body, Controller, Get, Post, Req, UseGuards, Delete, Param, Query, Res } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { TrustedDeviceLoginDto, DeviceInfoDto } from './dto/device.dto';
import { GoogleAuthDto, DeviceLoginWithEmailDto } from './dto/oauth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequestUser } from '../../common/types/request-user.type';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DeviceService } from './services/device.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private deviceService: DeviceService,
  ) { }

  /**
   * Helper to extract client IP address
   * Supports x-forwarded-for header for proxied requests behind proxy/CDN
   */
  private getClientIp(req: Request): string | undefined {
    const xff = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xff) ? xff[0] : xff;
    // if behind proxy, x-forwarded-for is "client, proxy1, proxy2"
    const ipFromXff = forwarded?.split(',')[0]?.trim();
    return ipFromXff || req.ip;
  }

  @Post('send-otp')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 20 requests per minute per IP (database has 5 per 15min limit)
  sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    return this.auth.sendOtp(dto, this.getClientIp(req));
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 requests per minute per IP
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 requests per minute per IP
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, this.getClientIp(req));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  me(@Req() req: { user: RequestUser }) {
    return this.auth.getProfile(req.user.sub);
  }

  // ==================== Google OAuth Routes ====================

  @Post('google')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async googleAuthWithCode(@Body() dto: GoogleAuthDto) {
    // Exchange OAuth code for user info and login
    return this.auth.googleAuthWithCode(dto.code, dto.redirectUri);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const result = await this.auth.googleAuth(req.user);
    // result should include token OR short-lived code

    // OPTION A (quick MVP): send token to frontend in query
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/google?token=${result.accessToken}`;
    return res.redirect(redirectUrl);
  }

  @Post('google/complete-registration')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async completeGoogleRegistration(@Body() dto: CompleteGoogleRegistrationDto) {
    return this.auth.completeGoogleRegistration(
      dto.googleId,
      dto.email,
      dto.name,
      dto.schoolId,
      dto.role,
      dto.picture,
    );
  }

  // ==================== Trusted Device Routes ====================

  @Post('device-login')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async deviceLogin(@Body() dto: TrustedDeviceLoginDto | DeviceLoginWithEmailDto) {
    // Support both phone and email based device login
    if ('email' in dto) {
      return this.auth.deviceLoginWithEmail(dto.email, dto.deviceId, dto.deviceToken);
    } else {
      const phoneE164 = `+${dto.countryCode}${dto.mobileNo}`;
      return this.auth.verifyTrustedDevice(phoneE164, dto.deviceId, dto.deviceToken);
    }
  }

  @Post('login/with-device')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async loginWithDevice(
    @Body() dto: LoginDto & DeviceInfoDto,
    @Req() req: Request,
  ) {
    return this.auth.loginWithDevice(
      dto,
      dto.deviceId,
      dto.rememberDevice,
      dto.deviceName,
      this.getClientIp(req),
      req.headers['user-agent'],
    );
  }

  @Post('device/verify')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async verifyTrustedDevice(@Body() dto: TrustedDeviceLoginDto) {
    const phoneE164 = `+${dto.countryCode}${dto.mobileNo}`;
    return this.auth.verifyTrustedDevice(
      phoneE164,
      dto.deviceId,
      dto.deviceToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('devices')
  async getDevices(@Req() req: { user: RequestUser }) {
    return this.deviceService.getUserDevices(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Delete('devices/:deviceId')
  async removeDevice(
    @Req() req: { user: RequestUser },
    @Param('deviceId') deviceId: string,
  ) {
    const removed = await this.deviceService.removeDevice(req.user.sub, deviceId);
    return { success: removed };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Delete('devices')
  async removeAllDevices(@Req() req: { user: RequestUser }) {
    const count = await this.deviceService.removeAllUserDevices(req.user.sub);
    return { removedCount: count };
  }
}
