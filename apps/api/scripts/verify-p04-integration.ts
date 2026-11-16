import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { Session } from '@supabase/supabase-js';

import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { EmployeeSessionPolicyService } from '../src/auth/employee-session-policy.service.js';
import { SupabaseAuthGateway } from '../src/auth/supabase-auth.gateway.js';
import { createApplication } from '../src/bootstrap.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthRateLimitService } from '../src/security/auth-rate-limit.service.js';

function fakeJwt(sessionId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url');

  return `${header}.${payload}.test-signature`;
}

function fakeSession(sessionId: string): Session {
  return {
    access_token: fakeJwt(sessionId),
    refresh_token: randomBytes(32).toString('base64url'),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  } as Session;
}

async function sleep(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function main(): Promise<void> {
  if (process.env.P04_NONPROD_ACK !== 'YES') {
    throw new Error('P04_NONPROD_ACK=YES is required.');
  }

  const appA = await createApplication();
  const appB = await createApplication();

  let companyId: string | null = null;
  let employeeId: string | null = null;

  try {
    await appA.init();
    await appB.init();

    const dbA = appA.get(PrismaService);
    const dbB = appB.get(PrismaService);
    const sessionsA = appA.get(AuthSessionService);
    const sessionsB = appB.get(AuthSessionService);
    const authA = appA.get(AuthService);
    const authB = appB.get(AuthService);
    const limiterA = appA.get(AuthRateLimitService);
    const limiterB = appB.get(AuthRateLimitService);
    const policyA = appA.get(EmployeeSessionPolicyService);
    const providerA = appA.get(SupabaseAuthGateway);

    const suffix = randomBytes(6).toString('hex');
    const userId = randomUUID();

    const company = await dbA.company.create({
      data: {
        code: `P04-${suffix}`.toUpperCase(),
        name: 'P04 Verification',
      },
    });

    companyId = company.id;

    const employee = await dbA.employee.create({
      data: {
        companyId,
        authUserId: userId,
        employeeNumber: `P04-${suffix}`,
        username: `p04_${suffix}`,
        usernameNormalized: `p04_${suffix}`,
        email: `p04.${suffix}@example.com`,
        emailNormalized: `p04.${suffix}@example.com`,
        fullName: 'P04 Verification User',
        status: 'ACTIVE',
      },
    });

    employeeId = employee.id;

    // P04-T01: shared PostgreSQL rate limiter.
    const ratePolicy = {
      scope: 'p04-integration-test',
      identity: randomUUID(),
      limit: 5,
      windowSeconds: 900,
    };

    const rateResults = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        (index % 2 === 0 ? limiterA : limiterB).consume(ratePolicy),
      ),
    );

    assert.equal(rateResults.filter((result) => result.status === 'fulfilled').length, 5);

    const rateFailures = rateResults.filter(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult[];

    assert.equal(rateFailures.length, 1);
    assert.equal(rateFailures[0]!.reason.getStatus(), 429);

    console.log('P04-T01 shared rate limit: PASS');

    // R02: two NestJS instances share a refresh lease.
    const providerSession = fakeSession(randomUUID());
    const created = await sessionsA.create(employeeId, userId, providerSession);
    const active = await sessionsB.findActive(created.cookieToken);

    assert.ok(active);

    const [leaseA, leaseB] = await Promise.all([
      sessionsA.acquireRefreshLease(active.id, created.cookieToken),
      sessionsB.acquireRefreshLease(active.id, created.cookieToken),
    ]);

    assert.equal([leaseA, leaseB].filter(Boolean).length, 1);

    const winner = leaseA ?? leaseB;
    assert.ok(winner);

    const loserService = leaseA ? sessionsB : sessionsA;
    const loserLease = await loserService.acquireRefreshLease(active.id, created.cookieToken);

    assert.equal(loserLease, null);

    await (leaseA ? sessionsA : sessionsB).releaseRefreshLease(active.id, winner);

    // R02: provider timeout must not revoke local session.
    providerA.refreshSession = async () => {
      await sleep(400);

      throw new ServiceUnavailableException('Authentication provider temporarily unavailable.');
    };

    const pendingRefresh = authA.refresh(created.cookieToken);
    void pendingRefresh.catch(() => undefined);

    let observedLease = false;

    for (let attempt = 0; attempt < 30; attempt++) {
      const row = await dbB.authSession.findUnique({
        where: { id: active.id },
        select: { refreshLeaseId: true },
      });

      if (row?.refreshLeaseId) {
        observedLease = true;
        break;
      }

      await sleep(10);
    }

    assert.equal(observedLease, true);

    await assert.rejects(
      () => authB.refresh(created.cookieToken),
      (error: unknown) => error instanceof ConflictException && error.getStatus() === 409,
    );

    await assert.rejects(
      pendingRefresh,
      (error: unknown) => error instanceof ServiceUnavailableException,
    );

    assert.ok(
      await sessionsB.findActive(created.cookieToken),
      'Provider timeout must not revoke local session.',
    );

    console.log('R02 concurrent provider refresh: PASS');

    // R04: revoke all sessions.
    const secondSession = await sessionsB.create(employeeId, userId, fakeSession(randomUUID()));

    const revoked = await policyA.revokeAllSessions(employeeId);

    assert.equal(revoked, 2);
    assert.equal(await sessionsA.findActive(created.cookieToken), null);
    assert.equal(await sessionsB.findActive(secondSession.cookieToken), null);

    console.log('R04 revoke-all: PASS');

    // P04-T02: suspend invalidates active sessions.
    const beforeSuspend = await sessionsA.create(employeeId, userId, fakeSession(randomUUID()));

    await policyA.suspendEmployee(employeeId);

    assert.equal(await sessionsB.findActive(beforeSuspend.cookieToken), null);

    await assert.rejects(
      () => sessionsA.create(employeeId, userId, fakeSession(randomUUID())),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 401,
    );

    const updatedEmployee = await dbB.employee.findUnique({
      where: { id: employeeId },
      select: { status: true },
    });

    assert.equal(updatedEmployee?.status, 'SUSPENDED');

    console.log('P04-T02 suspension/invalidation: PASS');
    console.log('\nP04 DATABASE INTEGRATION: PASS');
  } finally {
    try {
      if (employeeId) {
        const db = appA.get(PrismaService);

        await db.authSession.deleteMany({ where: { employeeId } });
        await db.employee.deleteMany({ where: { id: employeeId } });
      }

      if (companyId) {
        const db = appA.get(PrismaService);

        await db.company.deleteMany({ where: { id: companyId } });
      }
    } finally {
      await appB.close();
      await appA.close();
    }
  }
}

await main();
