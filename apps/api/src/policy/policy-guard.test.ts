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
});
