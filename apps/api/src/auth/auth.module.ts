import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthIdentityResolver } from './auth-identity.resolver.js';
import { AuthService } from './auth.service.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthTokenCryptoService } from './auth-token-crypto.service.js';
import { SupabaseAuthGateway } from './supabase-auth.gateway.js';
import { EmployeeSessionPolicyService } from './employee-session-policy.service.js';
import { AuthCsrfService } from '../security/auth-csrf.service.js';
import { AuthRateLimitService } from '../security/auth-rate-limit.service.js';
import { AuthRateLimitGuard } from '../security/auth-rate-limit.guard.js';
import { AuthAuditService } from '../security/auth-audit.service.js';
import { AuthAuditInterceptor } from '../security/auth-audit.interceptor.js';

@Module({
  controllers: [AuthController],

  providers: [
    AuthService,
    AuthCookieService,
    AuthIdentityResolver,
    AuthSessionService,
    AuthTokenCryptoService,
    SupabaseAuthGateway,
    EmployeeSessionPolicyService,
    AuthCsrfService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    AuthAuditService,
    AuthAuditInterceptor,
  ],

  exports: [
    EmployeeSessionPolicyService,
    AuthCookieService,
    AuthSessionService
  ],
})
export class AuthModule { }
