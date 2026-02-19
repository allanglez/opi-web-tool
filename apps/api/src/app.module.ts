import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AuditModule } from './modules/audit/audit.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EvaluatorModule } from './modules/evaluator/evaluator.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AudioModule } from './modules/audio/audio.module';
import { ClassSummaryModule } from './modules/class-summary/class-summary.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RetentionModule } from './modules/retention/retention.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MockAuthGuard } from './common/guards/mock-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ScopesGuard } from './common/guards/scopes.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    IngestionModule,
    CyclesModule,
    ClassesModule,
    AuditModule,
    AssignmentsModule,
    SchedulingModule,
    EvaluatorModule,
    AssessmentsModule,
    AudioModule,
    ClassSummaryModule,
    ReportsModule,
    RetentionModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: process.env.AUTH_MOCK === 'true' ? MockAuthGuard : JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule { }
