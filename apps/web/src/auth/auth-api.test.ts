import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiHttpError, getCsrfToken, login, meWithRefresh } from './auth-api.js';

const BASE = 'https://api.example.com';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('P04 frontend authentication', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds a CSRF header to login', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          csrfToken: 'test-csrf-token',
        }),
      )
      .mockResolvedValueOnce(
        json({
          authenticated: true,
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await login(BASE, {
      identifier: 'user',
      password: 'password',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const requestInit = fetchMock.mock.calls[1]![1] as RequestInit;
    const headers = new Headers(requestInit.headers);

    expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token');
  });

  it('deduplicates CSRF bootstrap requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ csrfToken: 'shared-csrf' }));

    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      getCsrfToken('https://another-api.example.com'),
      getCsrfToken('https://another-api.example.com'),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not turn refresh 409 into logout', async () => {
    const refreshInProgress = json(
      {
        code: 'REFRESH_IN_PROGRESS',
      },
      409,
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ code: 'AUTHENTICATION_REQUIRED' }, 401))
      .mockResolvedValueOnce(json({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(refreshInProgress)
      .mockResolvedValueOnce(
        json({
          authenticated: true,
          user: { id: 'employee-1' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(meWithRefresh('https://concurrent-api.example.com')).resolves.toMatchObject({
      authenticated: true,
    });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));

    expect(urls.filter((url) => url.endsWith('/refresh'))).toHaveLength(1);

    expect(urls.filter((url) => url.endsWith('/logout'))).toHaveLength(0);
  });

  it('preserves structured HTTP error status', () => {
    const error = new ApiHttpError(429, 'AUTH_RATE_LIMITED', 300);

    expect(error.status).toBe(429);
    expect(error.code).toBe('AUTH_RATE_LIMITED');
    expect(error.retryAfter).toBe(300);
  });
});
