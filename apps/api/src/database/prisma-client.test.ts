import { describe, expect, it } from 'vitest';

import { normalizePostgresConnectionString } from './postgres-connection-string.js';

describe('normalizePostgresConnectionString', () => {
  it('uses libpq-compatible require semantics for pg connections', () => {
    const normalized = normalizePostgresConnectionString(
      'postgresql://user:password@example.com:5432/postgres?sslmode=require',
    );
    const url = new URL(normalized);

    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('uselibpqcompat')).toBe('true');
  });

  it('preserves an explicit libpq compatibility choice', () => {
    const normalized = normalizePostgresConnectionString(
      'postgresql://user:password@example.com:5432/postgres?sslmode=require&uselibpqcompat=false',
    );

    expect(new URL(normalized).searchParams.get('uselibpqcompat')).toBe('false');
  });

  it('does not modify other SSL modes', () => {
    const connectionString =
      'postgresql://user:password@example.com:5432/postgres?sslmode=verify-full';

    expect(normalizePostgresConnectionString(connectionString)).toBe(connectionString);
  });
});
