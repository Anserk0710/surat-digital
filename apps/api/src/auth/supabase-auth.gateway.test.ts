import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGateway } from './supabase-auth.gateway.js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

type GatewayOperation = 'signInWithPassword' | 'refreshSession' | 'getUser';

function createFixture() {
  const auth = {
    signInWithPassword: vi.fn(),
    refreshSession: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
  };

  vi.mocked(createClient).mockReturnValue({ auth } as never);

  const gateway = new SupabaseAuthGateway(
    new ConfigService({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'public-anon-key',
    }),
  );

  return { auth, gateway };
}

function mockProviderError(
  auth: ReturnType<typeof createFixture>['auth'],
  operation: GatewayOperation,
  error: { status?: number; code?: string },
): void {
  if (operation === 'getUser') {
    auth.getUser.mockResolvedValue({ data: { user: null }, error });
    return;
  }

  auth[operation].mockResolvedValue({
    data: { session: null, user: null },
    error,
  });
}

function rejectProviderCall(
  auth: ReturnType<typeof createFixture>['auth'],
  operation: GatewayOperation,
  error: Error,
): void {
  auth[operation].mockRejectedValue(error);
}

function invoke(gateway: SupabaseAuthGateway, operation: GatewayOperation) {
  switch (operation) {
    case 'signInWithPassword':
      return gateway.signInWithPassword('employee@example.com', 'password');
    case 'refreshSession':
      return gateway.refreshSession('refresh-token');
    case 'getUser':
      return gateway.getUser('access-token');
  }
}

describe('SupabaseAuthGateway provider error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<GatewayOperation>(['signInWithPassword', 'refreshSession', 'getUser'])(
    '%s maps invalid credentials or tokens to null',
    async (operation) => {
      for (const status of [400, 401]) {
        const { auth, gateway } = createFixture();
        mockProviderError(auth, operation, { status });

        await expect(invoke(gateway, operation)).resolves.toBeNull();
      }
    },
  );

  it.each<GatewayOperation>(['signInWithPassword', 'refreshSession', 'getUser'])(
    '%s maps temporary provider errors to 503',
    async (operation) => {
      for (const providerError of [
        { status: 429 },
        { status: 500 },
        { status: 503 },
        { code: 'network_error' },
      ]) {
        const { auth, gateway } = createFixture();
        mockProviderError(auth, operation, providerError);

        const request = invoke(gateway, operation);

        await expect(request).rejects.toBeInstanceOf(ServiceUnavailableException);
        await expect(request).rejects.toMatchObject({ status: 503 });
      }
    },
  );

  it.each<GatewayOperation>(['signInWithPassword', 'refreshSession', 'getUser'])(
    '%s maps network and timeout failures to 503',
    async (operation) => {
      for (const error of [new TypeError('fetch failed'), new Error('request timeout')]) {
        const { auth, gateway } = createFixture();
        rejectProviderCall(auth, operation, error);

        await expect(invoke(gateway, operation)).rejects.toMatchObject({ status: 503 });
      }
    },
  );
});
