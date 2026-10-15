import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/database/prisma.module';
import { RedisModule } from './common/cache/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { MessagesModule } from './modules/messages/messages.module';
import { HomeworksModule } from './modules/homeworks/homeworks.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { FeeModule } from './modules/fee/fee.module';
import { DataModule } from './modules/data/data.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { VotesModule } from './modules/votes/votes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RandomDrawsModule } from './modules/random-draws/random-draws.module';
import { PomodoroModule } from './modules/pomodoro/pomodoro.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ErrorsModule } from './modules/errors/errors.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ClassIsolationGuard } from './common/guards/class-isolation.guard';
import { RoleLevelGuard } from './common/guards/role-level.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { SecurityModule } from './common/security/security.module';
import { UploadsModule } from './common/uploads/uploads.module';
import { MaterialModule } from './modules/material/material.module';
import { ArchiveModule } from './modules/archive/archive.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    SecurityModule,
    AuthModule,
    ClassesModule,
    MessagesModule,
    HomeworksModule,
    AttendancesModule,
    FeeModule,
    DataModule,
    ActivitiesModule,
    VotesModule,
    TasksModule,
    RandomDrawsModule,
    PomodoroModule,
    SettingsModule,
    FeedbackModule,
    ErrorsModule,
    UploadsModule,
    MaterialModule,
    ArchiveModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClassIsolationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleLevelGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
