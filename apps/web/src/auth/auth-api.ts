import type { components } from '@surat-digital/api-client';

export type LoginInput = components['schemas']['LoginRequestDto'];

export type AuthUser = components['schemas']['AuthUserDto'];

export type LoginResponse = components['schemas']['AuthLoginResponseDto'];

export type RefreshResponse = components['schemas']['AuthRefreshResponseDto'];

export type MeResponse = components['schemas']['AuthMeResponseDto'];

const AUTH_BASE_PATH = '/api/v1/auth';

const pendingRefreshes = new Map<string, Promise<RefreshResponse>>();

const pendingCsrfTokens = new Map<string, Promise<string>>();

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfter?: number,
  ) {
    super(`API request failed with status ${status}.`);
    this.name = 'ApiHttpError';
  }
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function parseHttpError(response: Response): Promise<ApiHttpError> {
  const body: unknown = await response.json().catch(() => null);

  const code =
    body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
      ? body.code
      : undefined;

  const retryHeader = response.headers.get('Retry-After');

  const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined;

  return new ApiHttpError(response.status, code, retryAfter);
}

export function getCsrfToken(baseUrl: string): Promise<string> {
  const pending = pendingCsrfTokens.get(baseUrl);

  if (pending) {
    return pending;
  }

  const task = (async () => {
    const response = await fetch(endpoint(baseUrl, `${AUTH_BASE_PATH}/csrf`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw await parseHttpError(response);
    }

    const body: unknown = await response.json();

    if (
      !body ||
      typeof body !== 'object' ||
      !('csrfToken' in body) ||
      typeof body.csrfToken !== 'string'
    ) {
      throw new Error('Invalid CSRF response.');
    }

    return body.csrfToken;
  })();

  pendingCsrfTokens.set(baseUrl, task);

  void task.catch(() => {
    if (pendingCsrfTokens.get(baseUrl) === task) {
      pendingCsrfTokens.delete(baseUrl);
    }
  });

  return task;
}

async function apiRequest<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  requireCsrf = false,
  retryCsrf = true,
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set('Content-Type', 'application/json');

  if (requireCsrf) {
    headers.set('X-CSRF-Token', await getCsrfToken(baseUrl));
  }

  const response = await fetch(endpoint(baseUrl, path), {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await parseHttpError(response);

    // Re-issue expired CSRF token at most once.
    if (requireCsrf && retryCsrf && error.status === 403 && error.code === 'CSRF_INVALID') {
      pendingCsrfTokens.delete(baseUrl);

      return apiRequest<T>(baseUrl, path, init, requireCsrf, false);
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(baseUrl: string, input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    baseUrl,
    `${AUTH_BASE_PATH}/login`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    true,
  );
}

export function refresh(baseUrl: string): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>(
    baseUrl,
    `${AUTH_BASE_PATH}/refresh`,
    {
      method: 'POST',
    },
    true,
  );
}

export function refreshOnce(baseUrl: string): Promise<RefreshResponse> {
  const pending = pendingRefreshes.get(baseUrl);

  if (pending) {
    return pending;
  }

  const task = refresh(baseUrl).finally(() => {
    if (pendingRefreshes.get(baseUrl) === task) {
      pendingRefreshes.delete(baseUrl);
    }
  });

  pendingRefreshes.set(baseUrl, task);

  return task;
}

export async function logout(baseUrl: string): Promise<void> {
  await apiRequest<void>(baseUrl, `${AUTH_BASE_PATH}/logout`, { method: 'POST' }, true);

  pendingCsrfTokens.delete(baseUrl);
}

export function me(baseUrl: string): Promise<MeResponse> {
  return apiRequest<MeResponse>(baseUrl, `${AUTH_BASE_PATH}/me`, { method: 'GET' });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForConcurrentRefresh(baseUrl: string): Promise<MeResponse> {
  // No new provider refresh requests from this branch.
  // Another tab/request may already be rotating the cookie.
  for (let attempt = 0; attempt < 5; attempt++) {
    await delay(200 * 2 ** attempt);

    try {
      return await me(baseUrl);
    } catch (error) {
      if (!(error instanceof ApiHttpError) || error.status !== 401) {
        throw error;
      }
    }
  }

  throw new ApiHttpError(409, 'REFRESH_IN_PROGRESS');
}

export async function meWithRefresh(baseUrl: string): Promise<MeResponse> {
  try {
    return await me(baseUrl);
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.status !== 401) {
      throw error;
    }
  }

  try {
    await refreshOnce(baseUrl);
  } catch (error) {
    if (
      error instanceof ApiHttpError &&
      error.status === 409 &&
      error.code === 'REFRESH_IN_PROGRESS'
    ) {
      return waitForConcurrentRefresh(baseUrl);
    }

    throw error;
  }

  // One refresh + one /me retry.
  return me(baseUrl);
}
