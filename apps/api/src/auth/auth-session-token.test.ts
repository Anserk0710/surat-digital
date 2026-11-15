import { describe, expect, it } from 'vitest';
import {
  createOpaqueSessionToken,
  getSupabaseSessionId,
  hashSessionToken,
} from './auth-session-token.js';

describe('auth session token', () => {
  it('generates different opaque session tokens', () => {
    const first = createOpaqueSessionToken();

    const second = createOpaqueSessionToken();

    expect(first).not.toBe(second);

    expect(first.length).toBeGreaterThan(32);
  });

  it('hashes session tokens deterministically', () => {
    expect(hashSessionToken('test-token')).toBe(hashSessionToken('test-token'));

    expect(hashSessionToken('test-token')).toHaveLength(64);
  });

  it('reads Supabase session_id claim', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';

    const header = Buffer.from(
      JSON.stringify({
        alg: 'HS256',
        typ: 'JWT',
      }),
    ).toString('base64url');

    const payload = Buffer.from(
      JSON.stringify({
        session_id: sessionId,
      }),
    ).toString('base64url');

    const jwt = `${header}.${payload}.signature`;

    expect(getSupabaseSessionId(jwt)).toBe(sessionId);
  });
});
