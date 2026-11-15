export interface LoginInput {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: string;
  employeeNumber: string;
  username: string;
  email: string;
  fullName: string;
  status: string;

  company: {
    id: string;
    code: string;
    name: string;
  };
}

export interface LoginResponse {
  authenticated: true;
  sessionExpiresAt: string;
  user: AuthUser;
}

export interface RefreshResponse {
  refreshed: true;
  sessionExpiresAt: string;
}

export interface MeResponse {
  authenticated: true;
  user: AuthUser;
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
    throw new Error(`API request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function login(baseUrl: string, input: LoginInput): Promise<LoginResponse> {
  return apiRequest(baseUrl, '/api/auth/login', {
    method: 'POST',

    body: JSON.stringify(input),
  });
}

export function refresh(baseUrl: string): Promise<RefreshResponse> {
  return apiRequest(baseUrl, '/api/auth/refresh', {
    method: 'POST',
  });
}

export async function logout(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',

    credentials: 'include',
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout failed with status ${response.status}.`);
  }
}

export function me(baseUrl: string): Promise<MeResponse> {
  return apiRequest(baseUrl, '/api/auth/me', {
    method: 'GET',
  });
}
