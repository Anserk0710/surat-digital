import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getSupabaseSessionId(accessToken: string): string {
  const parts = accessToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid Supabase access token format.');
  }

  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;

  const sessionId = payload.session_id;

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('Supabase access token does not contain session_id.');
  }

  return sessionId;
}
