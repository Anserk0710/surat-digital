import { describe, expect, it } from 'vitest';

import { prepareOpenApiGenerationEnvironment } from './openapi-generation-environment.js';

describe('OpenAPI generation environment', () => {
  it('provides isolated 32-byte security keys when runtime secrets are absent', () => {
    const environment: NodeJS.ProcessEnv = {};

    prepareOpenApiGenerationEnvironment(environment);

    expect(Buffer.from(environment.AUTH_RATE_LIMIT_HMAC_KEY_BASE64!, 'base64')).toHaveLength(32);
    expect(Buffer.from(environment.AUTH_CSRF_SECRET_BASE64!, 'base64')).toHaveLength(32);
  });

  it('does not replace explicitly configured security keys', () => {
    const rateLimitKey = Buffer.alloc(32, 7).toString('base64');
    const csrfKey = Buffer.alloc(32, 8).toString('base64');
    const environment: NodeJS.ProcessEnv = {
      AUTH_RATE_LIMIT_HMAC_KEY_BASE64: rateLimitKey,
      AUTH_CSRF_SECRET_BASE64: csrfKey,
    };

    prepareOpenApiGenerationEnvironment(environment);

    expect(environment.AUTH_RATE_LIMIT_HMAC_KEY_BASE64).toBe(rateLimitKey);
    expect(environment.AUTH_CSRF_SECRET_BASE64).toBe(csrfKey);
  });
});
