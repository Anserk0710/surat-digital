import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthAuditService } from './auth-audit.service.js';

describe('P04-T04 structured auth logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs only allowlisted authentication metadata', () => {
    const captured: string[] = [];

    vi.spyOn(Logger.prototype, 'log').mockImplementation((message) => {
      captured.push(String(message));
    });

    const audit = new AuthAuditService();

    audit.record('auth.login', 'denied', 401);
    audit.record('auth.refresh', 'success', 200);
    audit.record('auth.csrf_denied', 'denied', 403);

    expect(captured).toHaveLength(3);

    for (const item of captured) {
      const entry = JSON.parse(item) as Record<string, unknown>;

      expect(Object.keys(entry).sort()).toEqual(['event', 'outcome', 'status', 'timestamp']);

      expect(entry).not.toHaveProperty('password');
      expect(entry).not.toHaveProperty('accessToken');
      expect(entry).not.toHaveProperty('refreshToken');
      expect(entry).not.toHaveProperty('pin');
    }
  });

  it('never emits known secret marker values', () => {
    const captured: string[] = [];

    vi.spyOn(Logger.prototype, 'log').mockImplementation((message) => {
      captured.push(String(message));
    });

    const audit = new AuthAuditService();

    audit.record('auth.login', 'denied', 401);
    audit.record('auth.rate_limited', 'denied', 429);

    const output = captured.join('\n');

    for (const marker of [
      'SECRET_PASSWORD_P04',
      'SECRET_REFRESH_TOKEN_P04',
      'SECRET_ACCESS_TOKEN_P04',
      'SECRET_PIN_P04',
    ]) {
      expect(output).not.toContain(marker);
    }
  });
});
