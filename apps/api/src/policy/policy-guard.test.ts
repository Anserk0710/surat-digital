import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import type { AuthCookieService } from '../auth/auth-cookie.service.js';
import type { AuthSessionService } from '../auth/auth-session.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { EffectivePermissionService } from './effective-permission.service.js';
import { PolicyGuard } from './policy.guard.js';

function createContext(): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        cookies: {},
        method: 'GET',
        path: '/api/v1/test',
        query: {},
      }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('P06 PolicyGuard security defaults', () => {
  it('rejects handlers without permission metadata', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    const guard = new PolicyGuard(
      reflector as unknown as Reflector,
      {} as AuthCookieService,
      {} as AuthSessionService,
      {} as PrismaService,
      {} as EffectivePermissionService,
    );

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows only a platform administrator through platform-only routes', async () => {
    const reflector = {
      getAllAndOverride: vi.fn((key: string) =>
        key === 'group-policy:requirement' ? { platformAdminOnly: true } : undefined,
      ),
    };
    const cookies = { read: vi.fn().mockReturnValue('session') };
    const sessions = {
      findActive: vi.fn().mockResolvedValue({ employeeId: 'employee', supabaseUserId: 'auth' }),
    };
    const employee = { id: 'employee', companyId: 'company', isPlatformAdmin: false };
    const prisma = { employee: { findFirst: vi.fn().mockImplementation(async () => employee) } };
    const guard = new PolicyGuard(
      reflector as unknown as Reflector,
      cookies as unknown as AuthCookieService,
      sessions as unknown as AuthSessionService,
      prisma as unknown as PrismaService,
      {} as EffectivePermissionService,
    );

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(ForbiddenException);
    employee.isPlatformAdmin = true;
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });
});
