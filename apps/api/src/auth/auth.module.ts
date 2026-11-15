import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthIdentityResolver } from './auth-identity.resolver.js';
import { AuthService } from './auth.service.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthTokenCryptoService } from './auth-token-crypto.service.js';
import { SupabaseAuthGateway } from './supabase-auth.gateway.js';

@Module({
  controllers: [AuthController],

  providers: [
    AuthService,
    AuthCookieService,
    AuthIdentityResolver,
    AuthSessionService,
    AuthTokenCryptoService,
    SupabaseAuthGateway,
  ],
})
export class AuthModule {}
