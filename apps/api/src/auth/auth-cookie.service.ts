import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

@Injectable()
export class AuthCookieService {
  private readonly cookieName: string;

  private readonly secure: boolean;

  private readonly sameSite: CookieOptions['sameSite'];

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.cookieName = configService.getOrThrow<string>('AUTH_SESSION_COOKIE_NAME');

    this.secure = configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE');

    this.sameSite = configService.getOrThrow<'lax' | 'strict' | 'none'>('AUTH_COOKIE_SAME_SITE');
  }

  read(request: Request): string | null {
    const value = request.cookies?.[this.cookieName];

    return typeof value === 'string' ? value : null;
  }

  write(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,

      path: '/api',

      expires: expiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/api',
    });
  }
}
