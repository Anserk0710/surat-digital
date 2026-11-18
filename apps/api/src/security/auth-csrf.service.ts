import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Injectable()
export class AuthCsrfService {
  private readonly secret: Buffer;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';

  private readonly cookieName = 'sd_csrf';
  private readonly cookiePath = '/api/v1';
  private readonly maxAgeMs = 2 * 60 * 60 * 1000;

  constructor(
    @Inject(ConfigService)
    config: ConfigService,
  ) {
    this.secret = Buffer.from(config.getOrThrow<string>('AUTH_CSRF_SECRET_BASE64'), 'base64');

    if (this.secret.length !== 32) {
      throw new Error('Invalid CSRF signing key.');
    }

    this.secure = config.getOrThrow<boolean>('AUTH_COOKIE_SECURE');

    this.sameSite = config.getOrThrow<'lax' | 'strict' | 'none'>('AUTH_COOKIE_SAME_SITE');
  }

  issue(response: Response): string {
    const nonce = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + this.maxAgeMs;
    const signature = this.sign(nonce, expiresAt);

    response.cookie(this.cookieName, `${nonce}.${expiresAt}.${signature}`, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.cookiePath,
      maxAge: this.maxAgeMs,
    });

    response.setHeader('Cache-Control', 'no-store');

    return nonce;
  }

  validate(request: Request): boolean {
    const token = request.header('X-CSRF-Token');

    const cookie = request.cookies?.[this.cookieName] as unknown;

    if (typeof token !== 'string' || typeof cookie !== 'string') {
      return false;
    }

    const match = cookie.match(/^([A-Za-z0-9_-]{43})\.(\d{13})\.([a-f0-9]{64})$/);

    if (!match) {
      return false;
    }

    const nonce = match[1]!;
    const expiresAt = Number(match[2]);
    const signature = match[3]!;

    if (!Number.isSafeInteger(expiresAt) || Date.now() >= expiresAt) {
      return false;
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return false;
    }

    return (
      this.secureEqual(token, nonce) && this.secureEqual(signature, this.sign(nonce, expiresAt))
    );
  }

  private sign(nonce: string, expiresAt: number): string {
    return createHmac('sha256', this.secret)
      .update(`surat-digital:csrf:v1:${nonce}:${expiresAt}`)
      .digest('hex');
  }

  private secureEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');

    return left.length === right.length && timingSafeEqual(left, right);
  }
}
