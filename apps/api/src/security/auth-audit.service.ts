import { Injectable, Logger } from '@nestjs/common';

export type AuthAuditEvent =
  | 'auth.login'
  | 'auth.refresh'
  | 'auth.logout'
  | 'auth.me'
  | 'auth.csrf'
  | 'auth.rate_limited'
  | 'auth.csrf_denied'
  | 'auth.origin_denied'
  | 'auth.employee_suspended'
  | 'auth.sessions_revoked';

export type AuthAuditOutcome = 'success' | 'denied' | 'error';

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger('AuthAudit');

  record(event: AuthAuditEvent, outcome: AuthAuditOutcome, status: number): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      outcome,
      status,
    };

    this.logger.log(JSON.stringify(entry));
  }
}
