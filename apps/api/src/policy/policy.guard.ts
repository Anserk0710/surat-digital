import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthCookieService } from '../auth/auth-cookie.service.js';
import { AuthSessionService } from '../auth/auth-session.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { EffectivePermissionService, type PolicyActor } from './effective-permission.service.js';
import { POLICY_REQUIREMENT_KEY, type PolicyRequirement } from './policy.decorators.js';

export type PolicyRequest = Request & {
  organizationActor?: PolicyActor;
};

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthCookieService)
    private readonly cookies: AuthCookieService,
    @Inject(AuthSessionService)
    private readonly sessions: AuthSessionService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EffectivePermissionService)
    private readonly permissions: EffectivePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const policy = this.reflector.getAllAndOverride<PolicyRequirement>(
      POLICY_REQUIREMENT_KEY,
      targets,
    );
    const legacyPermissions = this.reflector.getAllAndOverride<string[]>(
      'organization:permissions',
      targets,
    );
    const requirement = policy ?? (legacyPermissions ? { any: legacyPermissions } : null);

    if (!requirement) {
      throw this.forbidden();
    }

    const request = context.switchToHttp().getRequest<PolicyRequest>();
    const cookieToken = this.cookies.read(request);

    if (!cookieToken) {
      throw this.unauthorized();
    }

    const session = await this.sessions.findActive(cookieToken);

    if (!session) {
      throw this.unauthorized();
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: session.employeeId,
        authUserId: session.supabaseUserId,
        status: 'ACTIVE',
        company: { active: true },
      },
      select: { id: true, companyId: true },
    });

    if (!employee) {
      throw this.unauthorized();
    }

    const actor: PolicyActor = {
      employeeId: employee.id,
      companyId: employee.companyId,
    };

    if (!requirement.authenticatedOnly) {
      const hasAnyRequirement = (requirement.any?.length ?? 0) > 0;
      const hasAllRequirement = (requirement.all?.length ?? 0) > 0;

      if (!hasAnyRequirement && !hasAllRequirement) {
        throw this.forbidden();
      }

      if (hasAnyRequirement && !(await this.permissions.hasAny(actor, requirement.any!))) {
        throw this.forbidden();
      }

      if (hasAllRequirement && !(await this.permissions.hasAll(actor, requirement.all!))) {
        throw this.forbidden();
      }
    }

    request.organizationActor = actor;

    return true;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.',
    });
  }

  private forbidden(): ForbiddenException {
    return new ForbiddenException({
      code: 'PERMISSION_DENIED',
      message: 'Permission denied.',
    });
  }
}
