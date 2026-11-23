import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface ResolvedEmployeeIdentity {
  id: string;
  authUserId: string;
  email: string;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.normalize('NFKC').trim().toLowerCase();
}

@Injectable()
export class AuthIdentityResolver {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolve(
    identifier: string,
    trustedCompanyId?: string,
  ): Promise<ResolvedEmployeeIdentity | null> {
    const raw = identifier.normalize('NFKC').trim();

    const normalized = normalizeIdentifier(identifier);
    const isEmail = normalized.includes('@');

    const candidates = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(trustedCompanyId === undefined || isEmail ? {} : { companyId: trustedCompanyId }),
        authUserId: {
          not: null,
        },
        OR: isEmail
          ? [{ emailNormalized: normalized }]
          : [
              {
                emailNormalized: normalized,
              },
              {
                usernameNormalized: normalized,
              },
              {
                employeeNumber: raw,
              },
            ],
      },

      select: {
        id: true,
        authUserId: true,
        email: true,
      },

      take: 2,
    });
    if (candidates.length !== 1) {
      return null;
    }

    const candidate = candidates[0]!;

    if (!candidate.authUserId) {
      return null;
    }

    return {
      id: candidate.id,
      authUserId: candidate.authUserId,
      email: candidate.email,
    };
  }
}
