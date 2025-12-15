import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

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
  sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    return this.auth.sendOtp(dto, this.getClientIp(req));
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, this.getClientIp(req));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  me(@Req() req: { user: RequestUser }) {
    return this.auth.getProfile(req.user.sub);
  }
}
