import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { AuthAuditService } from '../security/auth-audit.service.js';

@Injectable()
export class EmployeeSessionPolicyService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(AuthAuditService)
    private readonly audit: AuthAuditService,
  ) {}

  async suspendEmployee(employeeId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found.');
      }

      // Employee UPDATE holds a row lock until commit.
      await tx.employee.update({
        where: { id: employeeId },
        data: { status: 'SUSPENDED' },
      });

      await tx.authSession.updateMany({
        where: {
          employeeId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          refreshLeaseId: null,
          refreshLeaseUntil: null,
        },
      });
    });

    this.audit.record('auth.employee_suspended', 'success', 200);
  }

  async revokeAllSessions(employeeId: string): Promise<number> {
    const count = await this.prisma.$transaction(async (tx) => {
      // Serialize with login/session creation for this employee.
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found.');
      }

      await tx.$queryRaw`
        SELECT "id"
        FROM public."employees"
        WHERE "id" = ${employeeId}::uuid
        FOR UPDATE
      `;

      const result = await tx.authSession.updateMany({
        where: {
          employeeId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          refreshLeaseId: null,
          refreshLeaseUntil: null,
        },
      });

      return result.count;
    });

    this.audit.record('auth.sessions_revoked', 'success', 200);

    return count;
  }
}
