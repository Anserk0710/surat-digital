import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import { mkdir, writeFile } from 'node:fs/promises';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { performance } from 'node:perf_hooks';

import pg from 'pg';

import { createPrismaClient } from '../src/database/prisma-client.js';

import { normalizePostgresConnectionString } from '../src/database/postgres-connection-string.js';

import type { PrismaService } from '../src/database/prisma.service.js';

import type { PolicyActor } from '../src/policy/effective-permission.service.js';

import { RlsContextService } from '../src/rls/rls-context.service.js';

interface RoleProbe {
  currentUser: string;
  isSuperuser: boolean;
  bypassRls: boolean;
  relationOwner: string;
  rlsEnabled: boolean;
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface BenchmarkStats {
  iterations: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function stats(samples: number[]): BenchmarkStats {
  const sorted = [...samples].sort((a, b) => a - b);

  const pick = (percentile: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1))]!;

  return {
    iterations: samples.length,

    meanMs: round(samples.reduce((sum, value) => sum + value, 0) / samples.length),

    p50Ms: round(pick(0.5)),

    p95Ms: round(pick(0.95)),
  };
}

async function benchmark(
  iterations: number,
  operation: () => Promise<void>,
): Promise<BenchmarkStats> {
  // Warm-up tidak masuk evidence.
  for (let index = 0; index < 10; index += 1) {
    await operation();
  }

  const samples: number[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();

    await operation();

    samples.push(performance.now() - started);
  }

  return stats(samples);
}

async function main(): Promise<void> {
  if (process.env.P07_NONPROD_ACK !== 'YES') {
    throw new Error('P07_NONPROD_ACK=YES is required.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('P07 verifier cannot run in production.');
  }

  const expectedDatabase = required('P07_EXPECTED_DATABASE_NAME');

  const runtimeUrl = required('DATABASE_URL');

  const migrationUrl = required('DIRECT_URL');

  const expectedRuntimeRole = process.env.P02_RUNTIME_ROLE_NAME?.trim() || 'surat_runtime';

  const iterations = Math.min(
    1_000,
    Math.max(20, Number.parseInt(process.env.P07_BENCHMARK_ITERATIONS || '100', 10) || 100),
  );

  const runtime = createPrismaClient(runtimeUrl);

  const migrator = createPrismaClient(migrationUrl);

  const rls = new RlsContextService(runtime as unknown as PrismaService);

  const fixtureIds = {
    companyId: '',

    employeeIds: [] as string[],

    resourceIds: [] as string[],
  };

  try {
    const database = await runtime.$queryRaw<
      Array<{
        name: string;
      }>
    >`
        SELECT
          current_database()
            AS name
      `;

    assert.equal(database[0]?.name, expectedDatabase, 'Unexpected P07 test database.');

    // ======================================================
    // P07-T01
    // ======================================================

    const roleRows = await runtime.$queryRaw<RoleProbe[]>`
        SELECT
          current_user
            AS "currentUser",

          role.rolsuper
            AS "isSuperuser",

          role.rolbypassrls
            AS "bypassRls",

          pg_get_userbyid(
            relation.relowner
          )
            AS "relationOwner",

          relation.relrowsecurity
            AS "rlsEnabled",

          has_table_privilege(
            current_user,
            'public.rls_poc_resources',
            'SELECT'
          )
            AS "canSelect",

          has_table_privilege(
            current_user,
            'public.rls_poc_resources',
            'INSERT'
          )
            AS "canInsert",

          has_table_privilege(
            current_user,
            'public.rls_poc_resources',
            'UPDATE'
          )
            AS "canUpdate",

          has_table_privilege(
            current_user,
            'public.rls_poc_resources',
            'DELETE'
          )
            AS "canDelete"

        FROM pg_roles AS role

        JOIN pg_class AS relation
          ON relation.relname =
            'rls_poc_resources'

        JOIN pg_namespace AS namespace
          ON namespace.oid =
            relation.relnamespace
          AND namespace.nspname =
            'public'

        WHERE role.rolname =
          current_user
      `;

    const role = roleRows[0];

    assert.ok(role, 'Unable to inspect P07 runtime role.');

    assert.equal(role.currentUser, expectedRuntimeRole);

    assert.equal(role.isSuperuser, false);

    assert.equal(role.bypassRls, false);

    assert.notEqual(role.relationOwner, role.currentUser);

    assert.equal(role.rlsEnabled, true);

    assert.deepEqual(
      {
        select: role.canSelect,

        insert: role.canInsert,

        update: role.canUpdate,

        delete: role.canDelete,
      },
      {
        select: true,
        insert: false,
        update: false,
        delete: false,
      },
    );

    console.log('P07-T01 PASS: runtime role is non-BYPASSRLS and probe relation is RLS-protected.');

    // ======================================================
    // Fixtures
    // ======================================================

    const suffix = randomBytes(5).toString('hex');

    const company = await migrator.company.create({
      data: {
        code: `P07_${suffix}`,

        name: 'P07 RLS Verification',
      },
    });

    fixtureIds.companyId = company.id;

    const officeA = await migrator.office.create({
      data: {
        companyId: company.id,

        code: `P07A_${suffix}`,

        name: 'P07 Office A',

        timezone: 'Asia/Makassar',
      },
    });

    const officeB = await migrator.office.create({
      data: {
        companyId: company.id,

        code: `P07B_${suffix}`,

        name: 'P07 Office B',

        timezone: 'Asia/Makassar',
      },
    });

    const division = await migrator.division.create({
      data: {
        companyId: company.id,

        code: `P07D_${suffix}`,

        name: 'P07 Division',
      },
    });

    const officeDivisionA = await migrator.officeDivision.create({
      data: {
        officeId: officeA.id,

        divisionId: division.id,
      },
    });

    const officeDivisionB = await migrator.officeDivision.create({
      data: {
        officeId: officeB.id,

        divisionId: division.id,
      },
    });

    async function createEmployee(label: string, officeDivisionId: string) {
      const authUserId = randomUUID();

      const key = randomBytes(5).toString('hex');

      const username = `p07_${label}_${key}`;

      const employee = await migrator.employee.create({
        data: {
          companyId: company.id,

          authUserId,

          employeeNumber: `P07_${label}_${key}`,

          username,

          usernameNormalized: username,

          email: `${username}@example.test`,

          emailNormalized: `${username}@example.test`,

          fullName: `P07 ${label}`,

          status: 'ACTIVE',
        },
      });

      fixtureIds.employeeIds.push(employee.id);

      await migrator.employeeAssignment.create({
        data: {
          employeeId: employee.id,

          officeDivisionId,

          isPrimary: true,
          active: true,
        },
      });

      return {
        employee,
        authUserId,
      };
    }

    const userA = await createEmployee('UserA', officeDivisionA.id);

    const userB = await createEmployee('UserB', officeDivisionB.id);

    const actorA: PolicyActor = {
      employeeId: userA.employee.id,

      companyId: company.id,
    };

    const actorB: PolicyActor = {
      employeeId: userB.employee.id,

      companyId: company.id,
    };

    const ownA = await migrator.rlsPocResource.create({
      data: {
        ownerEmployeeId: userA.employee.id,

        officeId: officeA.id,

        label: 'P07 User A / Office A',
      },
    });

    const ownB = await migrator.rlsPocResource.create({
      data: {
        ownerEmployeeId: userB.employee.id,

        officeId: officeB.id,

        label: 'P07 User B / Office B',
      },
    });

    const userAOtherOffice = await migrator.rlsPocResource.create({
      data: {
        ownerEmployeeId: userA.employee.id,

        officeId: officeB.id,

        label: 'P07 User A / Foreign Office',
      },
    });

    fixtureIds.resourceIds.push(ownA.id, ownB.id, userAOtherOffice.id);

    const readResource = (actor: PolicyActor, id: string) =>
      rls.run(actor, (tx) =>
        tx.rlsPocResource.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            ownerEmployeeId: true,
            officeId: true,
            label: true,
          },
        }),
      );

    // ======================================================
    // P07-T02
    // ======================================================

    assert.equal((await readResource(actorA, ownA.id))?.id, ownA.id);

    assert.equal(await readResource(actorA, ownB.id), null);

    assert.equal(await readResource(actorA, userAOtherOffice.id), null);

    assert.equal((await readResource(actorB, ownB.id))?.id, ownB.id);

    assert.equal(await readResource(actorB, ownA.id), null);

    console.log('P07-T02 PASS: cross-user and cross-office Prisma reads are denied by RLS.');

    // Query tanpa transaction context harus fail closed.
    const withoutContext = await runtime.rlsPocResource.findMany({
      where: {
        id: {
          in: fixtureIds.resourceIds,
        },
      },

      select: {
        id: true,
      },
    });

    assert.deepEqual(withoutContext, []);

    // ======================================================
    // P07-T03
    // ======================================================

    // max=1 sengaja dipakai agar transaksi berikutnya
    // menggunakan physical connection yang sama.
    const singleConnectionPool = new pg.Pool({
      connectionString: normalizePostgresConnectionString(runtimeUrl),

      max: 1,
    });

    try {
      const client = await singleConnectionPool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `
            SELECT
              set_config(
                'request.jwt.claim.sub',
                $1,
                true
              ),
              set_config(
                'app.employee_id',
                $2,
                true
              ),
              set_config(
                'app.company_id',
                $3,
                true
              ),
              set_config(
                'app.office_id',
                $4,
                true
              )
          `,
          [userA.authUserId, userA.employee.id, company.id, officeA.id],
        );

        const inside = await client.query<{
          employeeId: string | null;
        }>(
          `
              SELECT
                NULLIF(
                  current_setting(
                    'app.employee_id',
                    true
                  ),
                  ''
                )
                  AS "employeeId"
            `,
        );

        assert.equal(inside.rows[0]?.employeeId, userA.employee.id);

        await client.query('COMMIT');

        // Physical connection sama,
        // tetapi transaction berikutnya tidak boleh
        // mewarisi context sebelumnya.
        await client.query('BEGIN');

        const after = await client.query<{
          authUserId: string | null;
          employeeId: string | null;
          companyId: string | null;
          officeId: string | null;
        }>(
          `
              SELECT
                NULLIF(
                  current_setting(
                    'request.jwt.claim.sub',
                    true
                  ),
                  ''
                )
                  AS "authUserId",

                NULLIF(
                  current_setting(
                    'app.employee_id',
                    true
                  ),
                  ''
                )
                  AS "employeeId",

                NULLIF(
                  current_setting(
                    'app.company_id',
                    true
                  ),
                  ''
                )
                  AS "companyId",

                NULLIF(
                  current_setting(
                    'app.office_id',
                    true
                  ),
                  ''
                )
                  AS "officeId"
            `,
        );

        assert.deepEqual(after.rows[0], {
          authUserId: null,
          employeeId: null,
          companyId: null,
          officeId: null,
        });

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    } finally {
      await singleConnectionPool.end();
    }

    // Concurrent Prisma transactions juga harus
    // tetap terisolasi.
    await Promise.all(
      Array.from(
        {
          length: 12,
        },

        (_, index) => {
          const actor = index % 2 === 0 ? actorA : actorB;

          const allowedId = index % 2 === 0 ? ownA.id : ownB.id;

          const deniedId = index % 2 === 0 ? ownB.id : ownA.id;

          return rls.run(
            actor,

            async (tx) => {
              const [allowed, denied] = await Promise.all([
                tx.rlsPocResource.findUnique({
                  where: {
                    id: allowedId,
                  },
                  select: {
                    id: true,
                  },
                }),

                tx.rlsPocResource.findUnique({
                  where: {
                    id: deniedId,
                  },
                  select: {
                    id: true,
                  },
                }),
              ]);

              assert.equal(allowed?.id, allowedId);

              assert.equal(denied, null);
            },
          );
        },
      ),
    );

    console.log('P07-T03 PASS: tx-local identity does not leak across reused/pool connections.');

    // ======================================================
    // P07-T04
    // ======================================================

    const authzOnly = await benchmark(
      iterations,

      async () => {
        const row = await runtime.employee.findFirst({
          where: {
            id: actorA.employeeId,

            companyId: actorA.companyId,

            status: 'ACTIVE',

            company: {
              active: true,
            },

            assignments: {
              some: {
                active: true,
                isPrimary: true,

                officeDivision: {
                  active: true,

                  office: {
                    id: officeA.id,

                    active: true,

                    companyId: actorA.companyId,
                  },
                },
              },
            },
          },

          select: {
            id: true,
          },
        });

        assert.equal(row?.id, actorA.employeeId);
      },
    );

    const authzPlusRls = await benchmark(
      iterations,

      async () => {
        const row = await readResource(actorA, ownA.id);

        assert.equal(row?.id, ownA.id);
      },
    );

    const benchmarkEvidence = {
      phaseId: 'P07',

      generatedAt: new Date().toISOString(),

      database: expectedDatabase,

      runtimeRole: role.currentUser,

      methodology: {
        kind: 'sequential microbenchmark',

        note: 'Directional comparison only; rerun under staging load before production sizing.',

        authzOnly:
          'One explicit Prisma authorization/scope query without interactive RLS transaction context.',

        authzPlusRls:
          'RlsContextService interactive transaction: actor lookup, transaction-local set_config, then protected Prisma read.',
      },

      authzOnly,

      authzPlusRls,

      delta: {
        p95Ms: round(authzPlusRls.p95Ms - authzOnly.p95Ms),

        p95Ratio: round(authzPlusRls.p95Ms / Math.max(authzOnly.p95Ms, 0.001)),
      },

      complexityTradeoff: [
        'Backend authorization remains mandatory and is not replaced by RLS.',
        'Every RLS-protected request requires one interactive transaction.',
        'Identity is set only with transaction-local set_config(..., true).',
        'Every protected Prisma query must use the same transaction client.',
        'Missing context fails closed and returns zero protected rows.',
      ],
    };

    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

    const evidenceDirectory = path.join(root, 'docs/evidence/P07');

    await mkdir(evidenceDirectory, {
      recursive: true,
    });

    await writeFile(
      path.join(evidenceDirectory, 'benchmark.json'),

      JSON.stringify(benchmarkEvidence, null, 2) + '\n',
    );

    console.log(
      [
        'P07-T04 PASS:',
        `p95 authz-only=${authzOnly.p95Ms}ms,`,
        `authz+RLS=${authzPlusRls.p95Ms}ms,`,
        `ratio=${benchmarkEvidence.delta.p95Ratio}x.`,
      ].join(' '),
    );

    console.log('\nP07 BACKEND VERIFICATION: PASS');
  } finally {
    try {
      // Probe rows harus dihapus menggunakan
      // migration/test role karena runtime read-only.
      if (fixtureIds.resourceIds.length > 0) {
        await migrator.rlsPocResource.deleteMany({
          where: {
            id: {
              in: fixtureIds.resourceIds,
            },
          },
        });
      }

      if (fixtureIds.employeeIds.length > 0) {
        await migrator.employeeAssignment.deleteMany({
          where: {
            employeeId: {
              in: fixtureIds.employeeIds,
            },
          },
        });

        await migrator.employee.deleteMany({
          where: {
            id: {
              in: fixtureIds.employeeIds,
            },
          },
        });
      }

      if (fixtureIds.companyId) {
        await migrator.officeDivision.deleteMany({
          where: {
            office: {
              companyId: fixtureIds.companyId,
            },
          },
        });

        await migrator.office.deleteMany({
          where: {
            companyId: fixtureIds.companyId,
          },
        });

        await migrator.division.deleteMany({
          where: {
            companyId: fixtureIds.companyId,
          },
        });

        await migrator.company.deleteMany({
          where: {
            id: fixtureIds.companyId,
          },
        });
      }
    } finally {
      await runtime.$disconnect();
      await migrator.$disconnect();
    }
  }
}

await main();
