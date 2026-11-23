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
    const requirement =
      policy ?? (legacyPermissions ? { any: legacyPermissions, platformAdminAllowed: true } : null);

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
      select: { id: true, companyId: true, isPlatformAdmin: true },
    });

    if (!employee) {
      throw this.unauthorized();
    }

    const actor: PolicyActor = {
      employeeId: employee.id,
      companyId: employee.companyId,
      isPlatformAdmin: employee.isPlatformAdmin,
    };

    if (requirement.platformAdminOnly && !actor.isPlatformAdmin) {
      throw this.forbidden();
    }

    if (
      !requirement.authenticatedOnly &&
      !requirement.platformAdminOnly &&
      !(requirement.platformAdminAllowed && actor.isPlatformAdmin)
    ) {
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

    const route = request.path;
    const isOrganizationChild =
      /^\/api\/v1\/organization\/(?:offices|divisions|job-titles|office-divisions|assignments|changes)(?:\/|$)/.test(
        route,
      );
    if (isOrganizationChild || route === '/api/v1/users') {
      const selectedCompanyId = request.query.companyId;
      if (selectedCompanyId !== undefined) {
        if (
          typeof selectedCompanyId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            selectedCompanyId,
          ) ||
          (!actor.isPlatformAdmin && selectedCompanyId !== actor.companyId)
        ) {
          throw this.forbidden();
        }
        actor.companyId = selectedCompanyId;
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
