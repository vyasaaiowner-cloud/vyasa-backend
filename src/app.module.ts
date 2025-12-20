import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AnnouncementModule } from './modules/announcements/announcement.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SectionsModule } from './modules/sections/sections.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        // General global limit (all endpoints)
        ttl: 60000, // milliseconds (60 seconds)
        limit: 120, // requests per minute per IP
      },
    ]),
    HealthModule,
    PrismaModule,
    AuthModule,
    SchoolsModule,
    ClassesModule,
    SectionsModule,
    TeachersModule,
    StudentsModule,
    AttendanceModule,
    AnnouncementModule,
    HolidaysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
