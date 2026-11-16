import { createHmac } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';

export interface RateLimitPolicy {
  scope: string;
  identity: string;
  limit: number;
  windowSeconds: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly key: Buffer;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    config: ConfigService,
  ) {
    this.key = Buffer.from(config.getOrThrow<string>('AUTH_RATE_LIMIT_HMAC_KEY_BASE64'), 'base64');

    if (this.key.length !== 32) {
      throw new Error('Invalid rate-limit signing key.');
    }
  }

  async consume(policy: RateLimitPolicy): Promise<void> {
    const now = Date.now();
    const windowMs = policy.windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowEnd = windowStart + windowMs;

    const id = createHmac('sha256', this.key)
      .update(`${policy.scope}\0${windowStart}\0${policy.identity}`)
      .digest('hex');

    let count: number;

    try {
      const bucket = await this.prisma.authRateLimitBucket.upsert({
        where: { id },
        create: {
          id,
          requestCount: 1,
          expiresAt: new Date(windowEnd + windowMs),
        },

        update: {
          requestCount: { increment: 1 },
        },

        select: {
          requestCount: true,
        },
      });

      count = bucket.requestCount;
    } catch {
      throw new ServiceUnavailableException({
        code: 'AUTH_TEMPORARILY_UNAVAILABLE',
        message: 'Authentication temporarily unavailable.',
      });
    }

    if (count > policy.limit) {
      const retryAfter = Math.max(1, Math.ceil((windowEnd - now) / 1000));

      throw new HttpException(
        {
          code: 'AUTH_RATE_LIMITED',
          message: 'Too many requests.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: { retryAfter },
        },
      );
    }
  }
}
