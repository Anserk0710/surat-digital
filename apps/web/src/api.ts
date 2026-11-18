import { ApiHttpError, getCsrfToken } from './auth/auth-api.js';

export const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET';
  const mutation = !['GET', 'HEAD'].includes(method);
  const headers = new Headers(init.headers);
  if (mutation) {
    headers.set('X-CSRF-Token', await getCsrfToken(baseUrl));
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const code =
      body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : undefined;
    throw new ApiHttpError(response.status, code);
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
