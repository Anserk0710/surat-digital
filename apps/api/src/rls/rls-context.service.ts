import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';

export type RlsAccessPurpose = 'DEFAULT' | 'DOCUMENT_DOWNLOAD';

export interface RlsIdentityContext {
  authUserId: string;
  employeeId: string;
  companyId: string;
  officeId: string | null;
}

@Injectable()
export class RlsContextService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  run<T>(
    actor: PolicyActor,
    operation: (tx: Prisma.TransactionClient, context: RlsIdentityContext) => Promise<T>,
  ): Promise<T> {
    return this.runInternal(actor, true, 'DEFAULT', operation);
  }

  runIdentity<T>(
    actor: PolicyActor,
    operation: (tx: Prisma.TransactionClient, context: RlsIdentityContext) => Promise<T>,
  ): Promise<T> {
    return this.runInternal(actor, false, 'DEFAULT', operation);
  }

  runDocumentDownload<T>(
    actor: PolicyActor,
    operation: (tx: Prisma.TransactionClient, context: RlsIdentityContext) => Promise<T>,
  ): Promise<T> {
    return this.runInternal(actor, false, 'DOCUMENT_DOWNLOAD', operation);
  }

  private runInternal<T>(
    actor: PolicyActor,
    requirePrimaryOffice: boolean,
    accessPurpose: RlsAccessPurpose,
    operation: (tx: Prisma.TransactionClient, context: RlsIdentityContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const context = await this.resolveContext(tx, actor, requirePrimaryOffice);

        await tx.$queryRaw`
        SELECT
          set_config(
            'request.jwt.claim.sub',
            ${context.authUserId},
            true
          ),
          set_config(
            'app.employee_id',
            ${context.employeeId},
            true
          ),
          set_config(
            'app.company_id',
            ${context.companyId},
            true
          ),
          set_config(
            'app.office_id',
            ${context.officeId ?? ''},
            true
          ),
          set_config('app.access_purpose', ${accessPurpose}, true)
      `;

        return operation(tx, context);
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  }

  private async resolveContext(
    tx: Prisma.TransactionClient,
    actor: PolicyActor,
    requirePrimaryOffice: boolean,
  ): Promise<RlsIdentityContext> {
    const today = new Date().toISOString().slice(0, 10);

    const employee = await tx.employee.findFirst({
      where: {
        id: actor.employeeId,
        companyId: actor.companyId,
        status: 'ACTIVE',
        authUserId: {
          not: null,
        },
        company: {
          active: true,
        },
      },
      select: {
        authUserId: true,

        assignments: {
          where: {
            active: true,
            isPrimary: true,

            officeDivision: {
              active: true,

              office: {
                active: true,
                companyId: actor.companyId,
              },
            },
          },

          select: {
            validFrom: true,
            validUntil: true,

            officeDivision: {
              select: {
                officeId: true,
              },
            },
          },

          take: 1,
        },
      },
    });

    const authUserId = employee?.authUserId;
    const assignment = employee?.assignments[0];

    const validFrom = assignment?.validFrom?.toISOString().slice(0, 10);

    const validUntil = assignment?.validUntil?.toISOString().slice(0, 10);

    const assignmentIsCurrent =
      Boolean(assignment) &&
      (!validFrom || validFrom <= today) &&
      (!validUntil || validUntil >= today);

    const officeId = assignmentIsCurrent ? assignment?.officeDivision.officeId : undefined;

    if (!authUserId) {
      throw new ForbiddenException({
        code: 'RLS_CONTEXT_UNAVAILABLE',
        message: 'Access context unavailable.',
      });
    }

    if (requirePrimaryOffice && !officeId) {
      throw new ForbiddenException({
        code: 'RLS_CONTEXT_UNAVAILABLE',
        message: 'Access context unavailable.',
      });
    }

    return {
      authUserId,
      employeeId: actor.employeeId,
      companyId: actor.companyId,
      officeId: officeId ?? null,
    };
  }
}
