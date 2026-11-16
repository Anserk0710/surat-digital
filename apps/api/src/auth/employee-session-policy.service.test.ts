import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { AuthAuditService } from '../security/auth-audit.service.js';
import { EmployeeSessionPolicyService } from './employee-session-policy.service.js';

describe('P04-T02 employee suspension', () => {
  it('suspends employee and revokes sessions in one transaction', async () => {
    const employeeUpdate = vi.fn().mockResolvedValue({});
    const sessionUpdate = vi.fn().mockResolvedValue({
      count: 3,
    });

    const transaction = vi.fn(async (callback) =>
      callback({
        employee: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'employee-1',
          }),
          update: employeeUpdate,
        },
        authSession: {
          updateMany: sessionUpdate,
        },
      }),
    );

    const prisma = {
      $transaction: transaction,
    };
    const audit = {
      record: vi.fn(),
    };

    const service = new EmployeeSessionPolicyService(
      prisma as unknown as PrismaService,
      audit as unknown as AuthAuditService,
    );

    await service.suspendEmployee('employee-1');

    expect(transaction).toHaveBeenCalledOnce();

    expect(employeeUpdate).toHaveBeenCalledWith({
      where: { id: 'employee-1' },
      data: { status: 'SUSPENDED' },
    });

    expect(sessionUpdate).toHaveBeenCalledWith({
      where: {
        employeeId: 'employee-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        refreshLeaseId: null,
        refreshLeaseUntil: null,
      },
    });

    expect(audit.record).toHaveBeenCalledWith('auth.employee_suspended', 'success', 200);
  });

  it('records a successful revoke-all event after the transaction', async () => {
    const transaction = vi.fn(async (callback) =>
      callback({
        employee: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'employee-1',
          }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'employee-1' }]),
        authSession: {
          updateMany: vi.fn().mockResolvedValue({
            count: 2,
          }),
        },
      }),
    );
    const prisma = {
      $transaction: transaction,
    };
    const audit = {
      record: vi.fn(),
    };
    const service = new EmployeeSessionPolicyService(
      prisma as unknown as PrismaService,
      audit as unknown as AuthAuditService,
    );

    const count = await service.revokeAllSessions('employee-1');

    expect(count).toBe(2);
    expect(audit.record).toHaveBeenCalledWith('auth.sessions_revoked', 'success', 200);
  });
});
