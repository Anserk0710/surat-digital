import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { AuthCsrfService } from './auth-csrf.service.js';
import { createCsrfMiddleware } from './csrf.middleware.js';
import { createTrustedOriginMiddleware } from './trusted-origin.middleware.js';

const origin = 'https://app.example.com';

function getSetCookieHeaders(response: {
  headers: Record<string, string | string[] | undefined>;
}): string[] {
  const header = response.headers['set-cookie'];

  if (!header) {
    return [];
  }

  return Array.isArray(header) ? header : [header];
}

function testApplication(secure = false) {
  const app = express();

  const config = new ConfigService({
    AUTH_CSRF_SECRET_BASE64: Buffer.alloc(32, 9).toString('base64'),

    AUTH_COOKIE_SECURE: secure,
    AUTH_COOKIE_SAME_SITE: secure ? 'none' : 'lax',
  });

  const csrf = new AuthCsrfService(config);

  app.use(cookieParser());

  app.use(createTrustedOriginMiddleware(origin));
  app.use(createCsrfMiddleware(csrf));

  app.get('/api/v1/auth/csrf', (_req, res) => {
    res.json({ csrfToken: csrf.issue(res) });
  });

  app.post('/api/v1/auth/login', (_req, res) => {
    res.json({ authenticated: true });
  });

  app.post('/api/v1/group-policy/test-csrf', (_req, res) => {
    res.json({ accepted: true });
  });

  return app;
}

describe('P04-T03 CSRF and Origin protection', () => {
  it('rejects POST without CSRF token', async () => {
    const response = await request(testApplication())
      .post('/api/v1/auth/login')
      .set('Origin', origin);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_INVALID');
  });

  it('rejects an untrusted origin', async () => {
    const response = await request(testApplication())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('rejects a forged CSRF token', async () => {
    const agent = request.agent(testApplication());

    await agent.get('/api/v1/auth/csrf').expect(200);

    const response = await agent
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', 'forged-token');

    expect(response.status).toBe(403);
  });

  it('accepts a correctly issued signed CSRF token', async () => {
    const agent = request.agent(testApplication());

    const csrfResponse = await agent.get('/api/v1/auth/csrf').expect(200);

    const token = csrfResponse.body.csrfToken as string;
    const [csrfCookie] = getSetCookieHeaders(csrfResponse);

    if (!csrfCookie) {
      throw new Error('Expected CSRF response to set a cookie.');
    }

    await agent
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', token)
      .set('Cookie', csrfCookie.split(';', 1)[0]!)
      .expect(200);
  });

  it('sends CSRF cookie to Group Policy mutation paths', async () => {
    const agent = request.agent(testApplication(false));
    const bootstrap = await agent.get('/api/v1/auth/csrf').expect(200);
    const csrfToken = bootstrap.body.csrfToken as string;

    await agent
      .post('/api/v1/group-policy/test-csrf')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfToken)
      .expect(200);
  });

  it('rejects an expired CSRF token replayed with its cookie', async () => {
    const app = testApplication();
    const issuedAt = Date.now();
    const csrfResponse = await request(app).get('/api/v1/auth/csrf').expect(200);
    const token = csrfResponse.body.csrfToken as string;
    const [csrfCookie] = getSetCookieHeaders(csrfResponse);

    if (!csrfCookie) {
      throw new Error('Expected CSRF response to set a cookie.');
    }

    vi.spyOn(Date, 'now').mockReturnValue(issuedAt + 2 * 60 * 60 * 1000 + 60_000);

    try {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', origin)
        .set('X-CSRF-Token', token)
        .set('Cookie', csrfCookie.split(';', 1)[0]!);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('CSRF_INVALID');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('issues a Secure HttpOnly cookie', async () => {
    const response = await request(testApplication(true)).get('/api/v1/auth/csrf').expect(200);

    const cookies = getSetCookieHeaders(response);

    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('Secure');
    expect(cookies[0]).toContain('SameSite=None');
  });
});
