import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import request from 'supertest';

import { SupabaseAuthGateway } from '../src/auth/supabase-auth.gateway.js';
import { createApplication } from '../src/bootstrap.js';

async function main(): Promise<void> {
  if (process.env.P04_NONPROD_ACK !== 'YES') {
    throw new Error('P04_NONPROD_ACK=YES required.');
  }

  if (process.env.AUTH_COOKIE_SECURE !== 'false') {
    throw new Error('HTTP verifier requires AUTH_COOKIE_SECURE=false.');
  }

  const origin = process.env.FRONTEND_ORIGIN;

  assert.ok(origin);

  const capturedLogs: string[] = [];
  const originalLog = Logger.prototype.log;
  const originalWarn = Logger.prototype.warn;
  const originalError = Logger.prototype.error;

  Logger.prototype.log = function (message: unknown): void {
    capturedLogs.push(String(message));
  };

  Logger.prototype.warn = function (message: unknown): void {
    capturedLogs.push(String(message));
  };

  Logger.prototype.error = function (message: unknown): void {
    capturedLogs.push(String(message));
  };

  let app: Awaited<ReturnType<typeof createApplication>> | null = null;

  try {
    app = await createApplication();
    await app.init();

    const provider = app.get(SupabaseAuthGateway);

    // No calls to real Supabase Auth for this test.
    provider.signInWithPassword = async () => null;

    const server = app.getHttpServer();
    const browser = request.agent(server);

    const csrfResponse = await browser.get('/api/v1/auth/csrf').set('Origin', origin).expect(200);

    const token = csrfResponse.body.csrfToken as string;

    assert.ok(token);

    const missingCsrf = await browser.post('/api/v1/auth/login').set('Origin', origin).send({
      identifier: 'missing-user',
      password: 'SECRET_PASSWORD_P04',
    });

    assert.equal(missingCsrf.status, 403);
    assert.equal(missingCsrf.body.code, 'CSRF_INVALID');

    const forgedOrigin = await browser
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .set('X-CSRF-Token', token)
      .send({
        identifier: 'missing-user',
        password: 'SECRET_PASSWORD_P04',
      });

    assert.equal(forgedOrigin.status, 403);

    const preflight = await request(server)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token');

    assert.notEqual(preflight.headers['access-control-allow-origin'], 'https://evil.example.com');

    console.log('P04-T03 HTTP security: PASS');

    const identifier = `p04-missing-${randomUUID()}`;
    let blocked = false;

    for (let attempt = 0; attempt < 35; attempt++) {
      const response = await browser
        .post('/api/v1/auth/login')
        .set('Origin', origin)
        .set('X-CSRF-Token', token)
        .send({
          identifier,
          password: 'SECRET_PASSWORD_P04',
        });

      if (response.status === 429) {
        assert.ok(response.headers['retry-after']);
        assert.equal(response.body.code, 'AUTH_RATE_LIMITED');
        blocked = true;
        break;
      }

      assert.equal(response.status, 401);
      assert.equal(response.body.code, 'INVALID_CREDENTIALS');
    }

    assert.equal(blocked, true);

    console.log('P04-T01 HTTP rate limiting: PASS');

    const output = capturedLogs.join('\n');

    for (const secret of [
      'SECRET_PASSWORD_P04',
      'SECRET_ACCESS_TOKEN_P04',
      'SECRET_REFRESH_TOKEN_P04',
      'SECRET_PIN_P04',
    ]) {
      assert.equal(output.includes(secret), false, `Sensitive marker leaked: ${secret}`);
    }

    console.log('P04-T04 logger redaction: PASS');
  } finally {
    if (app) {
      await app.close();
    }

    Logger.prototype.log = originalLog;
    Logger.prototype.warn = originalWarn;
    Logger.prototype.error = originalError;
  }
}

await main();
