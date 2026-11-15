import 'reflect-metadata';

import fs from 'node:fs/promises';
import path from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApplication } from '../src/bootstrap.js';

async function main(): Promise<void> {
  const app = await createApplication();

  try {
    const config = new DocumentBuilder()
      .setTitle('Surat Digital API')
      .setDescription('Versioned backend API contract')
      .setVersion('1.0.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const output = path.resolve(process.cwd(), '../../packages/api-contracts/openapi.json');

    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(document, null, 2) + '\n', 'utf8');

    console.log(`OpenAPI generated: ${output}`);
  } finally {
    await app.close();
  }
}

await main();
