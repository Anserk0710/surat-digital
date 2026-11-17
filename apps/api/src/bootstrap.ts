import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { createTrustedOriginMiddleware } from './security/trusted-origin.middleware.js';
import { AuthCsrfService } from './security/auth-csrf.service.js';
import { createCsrfMiddleware } from './security/csrf.middleware.js';
import { AuthAuditService } from './security/auth-audit.service.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());

  const frontendOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN');
  const csrf = app.get(AuthCsrfService);
  const audit = app.get(AuthAuditService);

  const trustedProxyHops = config.getOrThrow<number>('AUTH_TRUST_PROXY_HOPS');

  app.getHttpAdapter().getInstance().set('trust proxy', trustedProxyHops);

  app.use(
    createTrustedOriginMiddleware(frontendOrigin, () =>
      audit.record('auth.origin_denied', 'denied', 403),
    ),
  );

  app.use(createCsrfMiddleware(csrf, () => audit.record('auth.csrf_denied', 'denied', 403)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,
    }),
  );

  app.enableCors({
    origin: frontendOrigin,

    credentials: true,

    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],

    maxAge: 600,
  });

  app.enableShutdownHooks();

  return app;
}
