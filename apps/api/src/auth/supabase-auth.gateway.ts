import { Inject, Injectable } from '@nestjs/common';
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

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return null;
    }

    return {
      session: data.session,
      user: data.user,
    };
  }

  async refreshSession(refreshToken: string): Promise<SupabaseAuthentication | null> {
    const client = this.createClient();

    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return null;
    }

    return {
      session: data.session,
      user: data.user,
    };
  }

  async getUser(accessToken: string): Promise<User | null> {
    const client = this.createClient();

    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user;
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
    });
  }
}
