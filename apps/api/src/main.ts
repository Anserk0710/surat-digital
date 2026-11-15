import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApplication } from './bootstrap.js';

async function bootstrap(): Promise<void> {
  const app = await createApplication();

  const config = app.get(ConfigService);

  const port = config.getOrThrow<number>('PORT');

  await app.listen(port, '0.0.0.0');

  Logger.log(`Surat Digital API listening on port ${port}.`);
}

await bootstrap();
