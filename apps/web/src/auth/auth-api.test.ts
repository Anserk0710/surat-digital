import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiHttpError,
  login,
  logout,
  me,
  meWithRefresh,
  refresh,
  refreshOnce,
} from './auth-api.js';

const BASE_URL = 'https://api.example.com';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

describe('auth API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the versioned auth contract for every endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          jsonResponse({ authenticated: true, refreshed: true, sessionExpiresAt: '2099-01-01' }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await login(BASE_URL, { identifier: 'employee', password: 'password' });
    await refresh(BASE_URL);
    await logout(BASE_URL);
    await me(BASE_URL);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/api/v1/auth/login`,
      `${BASE_URL}/api/v1/auth/refresh`,
      `${BASE_URL}/api/v1/auth/logout`,
      `${BASE_URL}/api/v1/auth/me`,
    ]);
  });

  it('deduplicates concurrent refreshes and permits a later refresh', async () => {
    const deferred = createDeferred<Response>();
    const firstBody = { refreshed: true as const, sessionExpiresAt: '2099-01-01' };
    const secondBody = { refreshed: true as const, sessionExpiresAt: '2099-01-02' };
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(deferred.promise)
      .mockResolvedValueOnce(jsonResponse(secondBody));
    vi.stubGlobal('fetch', fetchMock);

    const concurrent = [refreshOnce(BASE_URL), refreshOnce(BASE_URL), refreshOnce(BASE_URL)];

    expect(fetchMock).toHaveBeenCalledOnce();
    deferred.resolve(jsonResponse(firstBody));

    const results = await Promise.all(concurrent);

    expect(results).toEqual([firstBody, firstBody, firstBody]);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);

    await expect(refreshOnce(BASE_URL)).resolves.toEqual(secondBody);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes once when /me returns 401', async () => {
    const userResponse = {
      authenticated: true,
      user: {
        id: 'employee-1',
        employeeNumber: 'EMP-1',
        username: 'employee',
        email: 'employee@example.com',
        fullName: 'Employee',
        status: 'ACTIVE',
        company: {
          id: 'company-1',
          code: 'COMPANY',
          name: 'Company',
        },
      },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          refreshed: true,
          sessionExpiresAt: '2099-01-01',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(userResponse));

    vi.stubGlobal('fetch', fetchMock);

    await expect(meWithRefresh(BASE_URL)).resolves.toEqual(userResponse);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/api/v1/auth/me`,
      `${BASE_URL}/api/v1/auth/refresh`,
      `${BASE_URL}/api/v1/auth/me`,
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not refresh on server error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(meWithRefresh(BASE_URL)).rejects.toBeInstanceOf(ApiHttpError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops when refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(meWithRefresh(BASE_URL)).rejects.toMatchObject({
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not start a refresh for a successful /me', async () => {
    const body = {
      authenticated: true,
      user: { id: 'employee-1' },
    };

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));

    vi.stubGlobal('fetch', fetchMock);

    await expect(meWithRefresh(BASE_URL)).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
