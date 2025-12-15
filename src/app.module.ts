import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PrismaModule,
    AuthModule,
    SchoolsModule,
    TeachersModule,
    StudentsModule,
    AttendanceModule,
    AnnouncementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
