import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is missing in .env');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: RequestUser) {
    // Check if user is a teacher and if they're active
    if (payload.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: payload.sub },
        select: { isActive: true },
      });

      if (!teacher || !teacher.isActive) {
        throw new UnauthorizedException('Teacher account is deactivated');
      }
    }

    return payload;
  }
}
