import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { AuthCookieService } from '../auth/auth-cookie.service.js';
import { AuthAuditService } from './auth-audit.service.js';

const WINDOW_SECONDS = 900;

function normalizeIdentifier(value: unknown): string {
  if (typeof value !== 'string') {
    return 'invalid';
  }

  return value.normalize('NFKC').trim().toLowerCase().slice(0, 320);
}

function isRateLimited(error: unknown): error is HttpException {
  return error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS;
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    @Inject(AuthRateLimitService)
    private readonly limiter: AuthRateLimitService,

    @Inject(AuthCookieService)
    private readonly cookies: AuthCookieService,

    @Inject(AuthAuditService)
    private readonly audit: AuthAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip = request.ip || request.socket.remoteAddress || 'unknown';

    const route = request.path;
    const method = request.method;
    const policies = [];

    if (method === 'POST' && route.endsWith('/auth/login')) {
      const body = request.body as { identifier?: unknown } | undefined;

      const identifier = normalizeIdentifier(body?.identifier);

      policies.push(
        {
          scope: 'login-ip',
          identity: ip,
          limit: 30,
          windowSeconds: WINDOW_SECONDS,
        },
        {
          scope: 'login-ip-identifier',
          identity: `${ip}\0${identifier}`,
          limit: 5,
          windowSeconds: WINDOW_SECONDS,
        },
      );
    } else if (method === 'POST' && route.endsWith('/auth/refresh')) {
      policies.push({
        scope: 'refresh-ip',
        identity: ip,
        limit: 60,
        windowSeconds: WINDOW_SECONDS,
      });

      const cookieToken = this.cookies.read(request);

      if (cookieToken) {
        policies.push({
          scope: 'refresh-session',
          identity: cookieToken,
          limit: 20,
          windowSeconds: WINDOW_SECONDS,
        });
      }
    } else if (method === 'POST' && route.endsWith('/auth/logout')) {
      policies.push({
        scope: 'logout-ip',
        identity: ip,
        limit: 60,
        windowSeconds: WINDOW_SECONDS,
      });
    } else if (method === 'GET' && route.endsWith('/auth/me')) {
      policies.push({
        scope: 'me-ip',
        identity: ip,
        limit: 120,
        windowSeconds: WINDOW_SECONDS,
      });
    } else if (method === 'GET' && route.endsWith('/auth/csrf')) {
      policies.push({
        scope: 'csrf-ip',
        identity: ip,
        limit: 60,
        windowSeconds: WINDOW_SECONDS,
      });
    }

    try {
      for (const policy of policies) {
        await this.limiter.consume(policy);
      }
    } catch (error) {
      if (isRateLimited(error)) {
        const cause = error.cause as { retryAfter?: number } | undefined;

        response.setHeader('Retry-After', String(cause?.retryAfter ?? WINDOW_SECONDS));
      }

      if (isRateLimited(error)) {
        this.audit.record('auth.rate_limited', 'denied', 429);
      }

      throw error;
    }

    return true;
  }
}
