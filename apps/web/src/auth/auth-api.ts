import type { components } from '@surat-digital/api-client';

export type LoginInput = components['schemas']['LoginRequestDto'];

export type AuthUser = components['schemas']['AuthUserDto'];

export type LoginResponse = components['schemas']['AuthLoginResponseDto'];

export type RefreshResponse = components['schemas']['AuthRefreshResponseDto'];

export type MeResponse = components['schemas']['AuthMeResponseDto'];

const AUTH_BASE_PATH = '/api/v1/auth';

const pendingRefreshes = new Map<string, Promise<RefreshResponse>>();

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(`API request failed with status ${status}.`);

    this.name = 'ApiHttpError';
  }
}

async function apiRequest<T>(baseUrl: string, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,

    credentials: 'include',

    headers: {
      'Content-Type': 'application/json',

      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiHttpError(response.status);
  }

  return response.json() as Promise<T>;
}

export function login(baseUrl: string, input: LoginInput): Promise<LoginResponse> {
  return apiRequest(baseUrl, `${AUTH_BASE_PATH}/login`, {
    method: 'POST',

    body: JSON.stringify(input),
  });
}

export function refresh(baseUrl: string): Promise<RefreshResponse> {
  return apiRequest(baseUrl, `${AUTH_BASE_PATH}/refresh`, {
    method: 'POST',
  });
}

export function refreshOnce(baseUrl: string): Promise<RefreshResponse> {
  const pendingRefresh = pendingRefreshes.get(baseUrl);

  if (pendingRefresh) {
    return pendingRefresh;
  }

  const refreshRequest = refresh(baseUrl).finally(() => {
    if (pendingRefreshes.get(baseUrl) === refreshRequest) {
      pendingRefreshes.delete(baseUrl);
    }
  });

  pendingRefreshes.set(baseUrl, refreshRequest);

  return refreshRequest;
}

export async function logout(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}${AUTH_BASE_PATH}/logout`, {
    method: 'POST',

    credentials: 'include',
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout failed with status ${response.status}.`);
  }
}

export function me(baseUrl: string): Promise<MeResponse> {
  return apiRequest(baseUrl, `${AUTH_BASE_PATH}/me`, {
    method: 'GET',
  });
}

export async function meWithRefresh(baseUrl: string): Promise<MeResponse> {
  try {
    return await me(baseUrl);
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.status !== 401) {
      throw error;
    }

    // Maksimum satu refresh attempt.
    await refreshOnce(baseUrl);

    // Maksimum satu retry /me.
    return me(baseUrl);
  }
}
