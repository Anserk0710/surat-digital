import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

interface SupabaseAuthentication {
  session: Session;
  user: User;
}

@Injectable()
export class SupabaseAuthGateway {
  private readonly supabaseUrl: string;

  private readonly supabaseAnonKey: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    this.supabaseAnonKey = configService.getOrThrow<string>('SUPABASE_ANON_KEY');
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<SupabaseAuthentication | null> {
    const client = this.createClient();

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      this.ensureProviderAvailable(error);

      if (error || !data.session || !data.user) {
        return null;
      }

      return {
        session: data.session,
        user: data.user,
      };
    } catch (error) {
      this.rethrowProviderFailure(error);
    }
  }

  async refreshSession(refreshToken: string): Promise<SupabaseAuthentication | null> {
    const client = this.createClient();

    try {
      const { data, error } = await client.auth.refreshSession({
        refresh_token: refreshToken,
      });

      this.ensureProviderAvailable(error);

      if (error || !data.session || !data.user) {
        return null;
      }

      return {
        session: data.session,
        user: data.user,
      };
    } catch (error) {
      this.rethrowProviderFailure(error);
    }
  }

  async getUser(accessToken: string): Promise<User | null> {
    const client = this.createClient();

    try {
      const { data, error } = await client.auth.getUser(accessToken);

      this.ensureProviderAvailable(error);

      if (error || !data.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      this.rethrowProviderFailure(error);
    }
  }

  async revokeSession(accessToken: string, refreshToken: string): Promise<boolean> {
    const client = this.createClient();

    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,

      refresh_token: refreshToken,
    });

    if (sessionError) {
      return false;
    }

    const { error } = await client.auth.signOut({
      scope: 'local',
    });

    return !error;
  }

  private createClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },

      global: {
        fetch: (input, init) => {
          const signals: AbortSignal[] = [AbortSignal.timeout(15_000)];

          if (init?.signal) {
            signals.push(init.signal);
          }

          return fetch(input, {
            ...init,
            signal: AbortSignal.any(signals),
          });
        },
      },
    });
  }

  private ensureProviderAvailable(
    error: { status?: number | undefined; code?: string | undefined } | null,
  ): void {
    if (
      error &&
      (!error.status ||
        error.status === 429 ||
        error.status >= 500 ||
        /network|timeout/i.test(error.code ?? ''))
    ) {
      throw new ServiceUnavailableException('Authentication provider temporarily unavailable.');
    }
  }

  private rethrowProviderFailure(error: unknown): never {
    if (error instanceof ServiceUnavailableException) {
      throw error;
    }

    throw new ServiceUnavailableException('Authentication provider temporarily unavailable.');
  }
}
