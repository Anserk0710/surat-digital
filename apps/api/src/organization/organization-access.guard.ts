import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthCookieService } from '../auth/auth-cookie.service.js';
import { AuthSessionService } from '../auth/auth-session.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  hasAnyAllowedPermission,
  ORGANIZATION_PERMISSIONS_KEY,
  type OrganizationPermission,
} from './organization-permissions.js';
export interface OrganizationActor {
  employeeId: string;
  companyId: string;
}

export type OrganizationRequest = Request & {
  organizationActor?: OrganizationActor;
};

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,

    @Inject(AuthCookieService)
    private readonly cookies: AuthCookieService,

    @Inject(AuthSessionService)
    private readonly sessions: AuthSessionService,

    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<OrganizationPermission[]>(
      ORGANIZATION_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      throw new ForbiddenException('Permission denied.');
    }

    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const cookieToken = this.cookies.read(request);

    if (!cookieToken) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication Required.',
      });
    }

    const session = await this.sessions.findActive(cookieToken);

    if (!session) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: session.employeeId,
        authUserId: session.supabaseUserId,
        status: 'ACTIVE',
        company: { active: true },
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const grants = await this.prisma.groupPermission.findMany({
      where: {
        active: true,
        permission: {
          active: true,
          code: { in: required },
        },
        group: {
          active: true,
          companyId: employee.companyId,
          employeeGroups: {
            some: {
              employeeId: employee.id,
              active: true,
            },
          },
        },
      },
      select: {
        effect: true,
        permission: {
          select: { code: true },
        },
      },
    });

    const permissionRows = grants.map((grant) => ({
      code: grant.permission.code,
      effect: grant.effect,
    }));

    if (!hasAnyAllowedPermission(permissionRows, required)) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied.',
      });
    }

    request.organizationActor = {
      employeeId: employee.id,
      companyId: employee.companyId,
    };

    return true;
  }
}
