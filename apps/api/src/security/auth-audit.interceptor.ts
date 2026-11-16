import { HttpException, Inject, Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { catchError, tap, throwError } from 'rxjs';
import { AuthAuditService, type AuthAuditEvent } from './auth-audit.service.js';

function resolveAuthEvent(request: Request): AuthAuditEvent | null {
  const path = request.path;

  if (path.endsWith('/auth/login')) {
    return 'auth.login';
  }

  if (path.endsWith('/auth/refresh')) {
    return 'auth.refresh';
  }

  if (path.endsWith('/auth/logout')) {
    return 'auth.logout';
  }

  if (path.endsWith('/auth/me')) {
    return 'auth.me';
  }

  if (path.endsWith('/auth/csrf')) {
    return 'auth.csrf';
  }

  return null;
}

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(AuthAuditService)
    private readonly audit: AuthAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const event = resolveAuthEvent(request);

    if (!event) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.audit.record(event, 'success', response.statusCode);
      }),

      catchError((error: unknown) => {
        const status = error instanceof HttpException ? error.getStatus() : 500;

        this.audit.record(event, status >= 500 ? 'error' : 'denied', status);

        return throwError(() => error);
      }),
    );
  }
}
