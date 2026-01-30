import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { ClassesModule } from './modules/classes/classes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MockAuthGuard } from './common/guards/mock-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ScopesGuard } from './common/guards/scopes.guard';

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
  ],
})
export class AppModule {}
