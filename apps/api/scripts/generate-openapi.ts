import 'reflect-metadata';

import fs from 'node:fs/promises';
import path from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { prepareOpenApiGenerationEnvironment } from './openapi-generation-environment.js';

async function main(): Promise<void> {
  // Contract generation never handles authentication traffic. These isolated
  // placeholders let Nest construct security providers without requiring
  // runtime secrets on developer and CI machines.
  prepareOpenApiGenerationEnvironment();

  const { createApplication } = await import('../src/bootstrap.js');
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
