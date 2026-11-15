import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { normalizePostgresConnectionString } from './postgres-connection-string.js';

export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({
    connectionString: normalizePostgresConnectionString(connectionString),
  });
}

export function createPrismaClient(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create PrismaClient.');
  }

  return new PrismaClient({
    adapter: createPrismaAdapter(connectionString),
  });
}
