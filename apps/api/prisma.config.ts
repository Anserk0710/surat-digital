import 'dotenv/config';
import { defineConfig } from 'prisma/config';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const directUrl = requiredEnvironmentVariable('DIRECT_URL');
const expectedMigrationRole = process.env.P02_MIGRATION_ROLE_NAME?.trim() || 'surat_migrator';
const configuredRole = decodeURIComponent(new URL(directUrl).username).split('.')[0];

if (configuredRole !== expectedMigrationRole) {
  throw new Error(
    `DIRECT_URL must use PostgreSQL role "${expectedMigrationRole}", found "${configuredRole}".`,
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  datasource: {
    url: directUrl,
  },
});
