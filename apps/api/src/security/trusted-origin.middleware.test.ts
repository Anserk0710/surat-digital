import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTrustedOriginMiddleware } from './trusted-origin.middleware.js';

const TRUSTED_ORIGIN = 'https://app.example.com';

function createTestApp() {
  const app = express();

  app.use(createTrustedOriginMiddleware(TRUSTED_ORIGIN));

  app.post('/api/v1/auth/login', (_req, res) => {
    res.status(200).json({ authenticated: true });
  });

  app.post('/api/v1/auth/refresh', (_req, res) => {
    res.status(200).json({ refreshed: true });
  });

  app.post('/api/v1/auth/logout', (_req, res) => {
    res.sendStatus(204);
  });

  return app;
}

describe('I03 trusted origin middleware', () => {
  it('accepts trusted frontend origin', async () => {
    await request(createTestApp())
      .post('/api/v1/auth/login')
      .set('Origin', TRUSTED_ORIGIN)
      .expect(200);
  });

  it.each([
    'https://evil.example.com',
    'https://app.example.com.evil.test',
    'null',
    'http://app.example.com',
  ])('rejects untrusted origin %s', async (origin) => {
    const response = await request(createTestApp())
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .expect(403);

    expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('rejects a mutation without Origin header', async () => {
    await request(createTestApp()).post('/api/v1/auth/logout').expect(403);
  });

  it('allows OPTIONS for CORS preflight processing', async () => {
    const response = await request(createTestApp()).options('/api/v1/auth/login');

    expect(response.status).not.toBe(403);
  });
});
