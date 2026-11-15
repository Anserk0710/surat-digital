const REQUIRED_STRING_VARIABLES = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'FRONTEND_ORIGIN',
  'AUTH_TOKEN_ENCRYPTION_KEY_BASE64',
] as const;

type SameSite = 'lax' | 'strict' | 'none';

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function parsePositiveInteger(value: unknown, fallback: number, key: string): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

function parseBoolean(value: unknown, fallback: boolean, key: string): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new Error(`${key} must be true or false.`);
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const validated = {
    ...config,
  };

  for (const key of REQUIRED_STRING_VARIABLES) {
    validated[key] = requiredString(config, key);
  }

  const frontendOrigin = requiredString(config, 'FRONTEND_ORIGIN');

  try {
    new URL(frontendOrigin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid URL.');
  }

  const encryptionKey = Buffer.from(
    requiredString(config, 'AUTH_TOKEN_ENCRYPTION_KEY_BASE64'),
    'base64',
  );

  if (encryptionKey.length !== 32) {
    throw new Error('AUTH_TOKEN_ENCRYPTION_KEY_BASE64 must be decode to exactly 32 bytes.');
  }

  const secureCookie = parseBoolean(config.AUTH_COOKIE_SECURE, false, 'AUTH_COOKIE_SECURE');

  const sameSite = String(config.AUTH_COOKIE_SAME_SITE ?? 'lax').toLowerCase() as SameSite;

  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none.');
  }

  if (sameSite === 'none' && !secureCookie) {
    throw new Error('SameSite=None requires AUTH_COOKIE_SECURE=true.');
  }

  if (config.NODE_ENV === 'production' && !secureCookie) {
    throw new Error('Production requires AUTH_COOKIE_SECURE=true.');
  }

  validated.PORT = parsePositiveInteger(config.PORT, 3000, 'PORT');

  validated.AUTH_SESSION_MAX_AGE_SECONDS = parsePositiveInteger(
    config.AUTH_SESSION_MAX_AGE_SECONDS,
    604800,
    'AUTH_SESSION_MAX_AGE_SECONDS',
  );

  validated.AUTH_COOKIE_SECURE = secureCookie;

  validated.AUTH_COOKIE_SAME_SITE = sameSite;

  validated.AUTH_SESSION_COOKIE_NAME =
    typeof config.AUTH_SESSION_COOKIE_NAME === 'string' && config.AUTH_SESSION_COOKIE_NAME.trim()
      ? config.AUTH_SESSION_COOKIE_NAME.trim()
      : 'sd_session';

  return validated;
}
