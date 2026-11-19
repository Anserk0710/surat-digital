import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

export type PermissionDecision = 'ALLOW' | 'DENY';

export interface PolicyActor {
  employeeId: string;
  companyId: string;
  isPlatformAdmin?: boolean;
}

export interface PermissionEffectRow {
  code: string;
  effect: PermissionDecision;
}

export interface EffectivePermission {
  code: string;
  decision: PermissionDecision;
}

export function resolveEffectivePermissions(
  codes: readonly string[],
  rows: readonly PermissionEffectRow[],
): EffectivePermission[] {
  const decisions = new Map<string, PermissionDecision>();

  for (const code of codes) {
    decisions.set(code, 'DENY');
  }

  const hasAllow = new Set<string>();
  const hasDeny = new Set<string>();

  for (const row of rows) {
    if (!decisions.has(row.code)) {
      continue;
    }

    if (row.effect === 'DENY') {
      hasDeny.add(row.code);
    } else if (row.effect === 'ALLOW') {
      hasAllow.add(row.code);
    }
  }

  return [...decisions.keys()].map((code) => ({
    code,
    decision: hasDeny.has(code) ? 'DENY' : hasAllow.has(code) ? 'ALLOW' : 'DENY',
  }));
}

@Injectable()
export class EffectivePermissionService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async evaluate(
    actor: PolicyActor,
    requestedCodes: readonly string[],
  ): Promise<EffectivePermission[]> {
    const codes = [...new Set(requestedCodes)];

    if (codes.length === 0) {
      return [];
    }

    // Deliberately read PostgreSQL for every authorization decision.
    const rows = await this.prisma.groupPermission.findMany({
      where: {
        active: true,
        permission: {
          active: true,
          code: { in: codes },
        },
        group: {
          active: true,
          companyId: actor.companyId,
          company: { active: true },
          employeeGroups: {
            some: {
              employeeId: actor.employeeId,
              active: true,
              employee: {
                companyId: actor.companyId,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      select: {
        effect: true,
        permission: { select: { code: true } },
      },
    });

    return resolveEffectivePermissions(
      codes,
      rows.map((row) => ({
        code: row.permission.code,
        effect: row.effect,
      })),
    );
  }

  async has(actor: PolicyActor, code: string): Promise<boolean> {
    const [result] = await this.evaluate(actor, [code]);

    return result?.decision === 'ALLOW';
  }

  async hasAny(actor: PolicyActor, codes: readonly string[]): Promise<boolean> {
    if (codes.length === 0) {
      return false;
    }

    const decisions = await this.evaluate(actor, codes);

    return decisions.some((item) => item.decision === 'ALLOW');
  }

  async hasAll(actor: PolicyActor, codes: readonly string[]): Promise<boolean> {
    if (codes.length === 0) {
      return false;
    }

    const decisions = await this.evaluate(actor, codes);

    return (
      decisions.length === new Set(codes).size &&
      decisions.every((item) => item.decision === 'ALLOW')
    );
  }
}
