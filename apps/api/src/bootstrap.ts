import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,
    }),
  );

  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_ORIGIN'),

    credentials: true,

    methods: ['GET', 'POST', 'OPTIONS'],

    allowedHeaders: ['Content-Type'],
  });

  app.enableShutdownHooks();

  return app;
}
