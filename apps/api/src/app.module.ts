import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { PrismaModule } from './database/prisma.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { PolicyModule } from './policy/policy.module.js';
import { UsersModule } from './users/users.module.js';
import { RlsModule } from './rls/rls.module.js';
import { DocumentModule } from './documents/document.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      validate: validateEnvironment,
    }),

    PrismaModule,
    AuthModule,
    PolicyModule,
    OrganizationModule,
    UsersModule,
    RlsModule,
    DocumentModule,
  ],
})
export class AppModule {}
