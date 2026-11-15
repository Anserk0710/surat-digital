import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { createTrustedOriginMiddleware } from './security/trusted-origin.middleware.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());

  const frontendOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN');

  app.use(createTrustedOriginMiddleware(frontendOrigin));

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

    methods: ['GET', 'POST', 'OPTIONS'],

    allowedHeaders: ['Content-Type'],
  });

  app.enableShutdownHooks();

  return app;
}
