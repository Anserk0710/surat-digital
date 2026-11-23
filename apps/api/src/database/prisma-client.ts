import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { normalizePostgresConnectionString } from './postgres-connection-string.js';

const serializedTransactionMethods = new Set<PropertyKey>([
  'queryRaw',
  'executeRaw',
  'createSavepoint',
  'rollbackToSavepoint',
  'releaseSavepoint',
  'commit',
  'rollback',
]);

/**
 * Prisma may fan out relation reads inside one transaction. The pg adapter
 * pins that transaction to one PoolClient, which cannot execute those reads
 * concurrently (pg@9 will reject them). Preserve Prisma's query order here.
 * Upstream: https://github.com/prisma/orm/issues/30925
 */
class SerializedPrismaPg extends PrismaPg {
  override async connect(): ReturnType<PrismaPg['connect']> {
    const adapter = await super.connect();
    const startTransaction = adapter.startTransaction.bind(adapter);

    adapter.startTransaction = async (isolationLevel) => {
      const transaction = await startTransaction(isolationLevel);
      let pending: Promise<void> = Promise.resolve();

      return new Proxy(transaction, {
        get(target, property) {
          const value = Reflect.get(target, property, target);
          if (typeof value !== 'function') {
            return value;
          }
          if (!serializedTransactionMethods.has(property)) {
            return value.bind(target);
          }

          return (...args: unknown[]) => {
            const result = pending.then(() => Reflect.apply(value, target, args));
            // A failed query must not prevent rollback or later cleanup.
            pending = result.then(
              () => undefined,
              () => undefined,
            );
            return result;
          };
        },
      });
    };

    return adapter;
  }
}

export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new SerializedPrismaPg({
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
