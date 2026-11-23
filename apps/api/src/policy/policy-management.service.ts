import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EffectivePermissionService, type PolicyActor } from './effective-permission.service.js';
import type {
  CreateGroupDto,
  SetGroupPermissionDto,
  SetGroupPermissionsBatchDto,
  UpdateGroupDto,
} from './policy.dto.js';

type TransactionClient = Prisma.TransactionClient;

type AuditAction =
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_ACTIVATED'
  | 'GROUP_DEACTIVATED'
  | 'MEMBERSHIP_GRANTED'
  | 'MEMBERSHIP_REVOKED'
  | 'POLICY_SET'
  | 'POLICY_REMOVED'
  | 'GROUP_DELETED_PERMANENT';

@Injectable()
export class PolicyManagementService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EffectivePermissionService)
    private readonly effective: EffectivePermissionService,
  ) {}

  private notFound(): never {
    throw new NotFoundException({
      code: 'GROUP_POLICY_NOT_FOUND',
      message: 'Group Policy resource not found.',
    });
  }

  private conflict(): never {
    throw new ConflictException({
      code: 'GROUP_POLICY_CONFLICT',
      message: 'Group Policy integrity conflict.',
    });
  }

  private async mutate<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      const code = (error as { code?: unknown })?.code;

      if (code === 'P2002' || code === 'P2003' || code === 'P2004') {
        this.conflict();
      }

      throw error;
    }
  }

  private async audit(
    tx: TransactionClient,
    actor: PolicyActor,
    action: AuditAction,
    targetType: string,
    targetId: string,
  ): Promise<void> {
    await tx.groupPolicyAudit.create({
      data: {
        companyId: actor.companyId,
        actorEmployeeId: actor.employeeId,
        action,
        targetType,
        targetId,
      },
    });
  }

  private async requireGroup(
    tx: TransactionClient,
    actor: PolicyActor,
    groupId: string,
    requireActive = false,
  ) {
    const group = await tx.group.findFirst({
      where: {
        id: groupId,
        companyId: actor.companyId,
        ...(requireActive ? { active: true } : {}),
      },
    });

    if (!group) {
      this.notFound();
    }

    return group;
  }

  async listPermissionCatalog() {
    return this.prisma.permission.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { code: 'asc' },
    });
  }

  async getMyEffectivePermissions(actor: PolicyActor) {
    const catalog = await this.prisma.permission.findMany({
      where: { active: true },
      select: { code: true },
      orderBy: { code: 'asc' },
    });

    return this.effective.evaluate(
      actor,
      catalog.map((item) => item.code),
    );
  }

  async listGroups(actor: PolicyActor) {
    return this.prisma.group.findMany({
      where: { companyId: actor.companyId },
      orderBy: [{ code: 'asc' }],
    });
  }

  async getGroup(actor: PolicyActor, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, companyId: actor.companyId },
    });

    if (!group) {
      this.notFound();
    }

    return group;
  }

  async createGroup(actor: PolicyActor, input: CreateGroupDto) {
    return this.mutate(async (tx) => {
      const company = await tx.company.findFirst({
        where: { id: actor.companyId, active: true },
        select: { id: true },
      });

      if (!company) {
        this.conflict();
      }

      const group = await tx.group.create({
        data: {
          companyId: actor.companyId,
          code: input.code,
          name: input.name,
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });

      await this.audit(tx, actor, 'GROUP_CREATED', 'Group', group.id);

      return group;
    });
  }

  async updateGroup(actor: PolicyActor, groupId: string, input: UpdateGroupDto) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId);

      const group = await tx.group.update({
        where: { id: groupId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });

      await this.audit(tx, actor, 'GROUP_UPDATED', 'Group', group.id);

      return group;
    });
  }

  async setGroupActive(actor: PolicyActor, groupId: string, active: boolean) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId);

      if (active) {
        const company = await tx.company.findFirst({
          where: { id: actor.companyId, active: true },
          select: { id: true },
        });

        if (!company) {
          this.conflict();
        }
      }

      const group = await tx.group.update({
        where: { id: groupId },
        data: { active },
      });

      if (!active) {
        await tx.employeeGroup.updateMany({
          where: { groupId },
          data: { active: false },
        });
        await tx.groupPermission.updateMany({
          where: { groupId },
          data: { active: false },
        });
      }

      await this.audit(
        tx,
        actor,
        active ? 'GROUP_ACTIVATED' : 'GROUP_DEACTIVATED',
        'Group',
        group.id,
      );

      return group;
    });
  }

  async deleteGroupPermanently(actor: PolicyActor, groupId: string) {
    return this.mutate(async (tx) => {
      const group = await this.requireGroup(tx, actor, groupId);

      if (group.code === 'ADMIN') {
        throw new BadRequestException({
          code: 'CANNOT_DELETE_ADMIN_GROUP',
          message: 'Grup ADMIN tidak boleh dihapus secara permanen.',
        });
      }

      await tx.groupPermission.deleteMany({ where: { groupId } });
      await tx.employeeGroup.deleteMany({ where: { groupId } });
      const deleted = await tx.group.delete({ where: { id: groupId } });

      await this.audit(tx, actor, 'GROUP_DELETED_PERMANENT', 'Group', groupId);

      return deleted;
    });
  }

  async listMembers(actor: PolicyActor, groupId: string) {
    await this.getGroup(actor, groupId);

    return this.prisma.employeeGroup.findMany({
      where: { groupId, employee: { companyId: actor.companyId } },
      select: {
        id: true,
        employeeId: true,
        groupId: true,
        active: true,
        employee: {
          select: { employeeNumber: true, fullName: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async searchMemberCandidates(actor: PolicyActor, groupId: string, query: string) {
    await this.getGroup(actor, groupId);
    if (typeof query !== 'string') {
      throw new BadRequestException({
        code: 'INVALID_MEMBER_SEARCH',
        message: 'Search must be text.',
      });
    }
    const search = query.trim();
    if (search.length < 2) {
      return [];
    }
    if (search.length > 100) {
      throw new BadRequestException({
        code: 'INVALID_MEMBER_SEARCH',
        message: 'Search is too long.',
      });
    }
    return this.prisma.employee.findMany({
      where: {
        companyId: actor.companyId,
        status: 'ACTIVE',
        employeeGroups: { none: { groupId, active: true } },
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, fullName: true, employeeNumber: true },
      orderBy: [{ fullName: 'asc' }, { employeeNumber: 'asc' }],
      take: 20,
    });
  }

  async addMember(actor: PolicyActor, groupId: string, employeeId: string) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId, true);

      const employee = await tx.employee.findFirst({
        where: { id: employeeId, companyId: actor.companyId, status: 'ACTIVE' },
        select: { id: true },
      });

      if (!employee) {
        throw new BadRequestException({
          code: 'INVALID_GROUP_MEMBER',
          message: 'Employee must be active in the same company.',
        });
      }

      const membership = await tx.employeeGroup.upsert({
        where: { employeeId_groupId: { employeeId, groupId } },
        create: { employeeId, groupId, active: true },
        update: { active: true },
      });

      await this.audit(tx, actor, 'MEMBERSHIP_GRANTED', 'EmployeeGroup', membership.id);

      return membership;
    });
  }

  async removeMember(actor: PolicyActor, groupId: string, employeeId: string) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId);

      const membership = await tx.employeeGroup.findUnique({
        where: { employeeId_groupId: { employeeId, groupId } },
      });

      if (!membership) {
        this.notFound();
      }

      const updated = await tx.employeeGroup.update({
        where: { id: membership.id },
        data: { active: false },
      });

      await this.audit(tx, actor, 'MEMBERSHIP_REVOKED', 'EmployeeGroup', updated.id);

      return updated;
    });
  }

  async listPolicies(actor: PolicyActor, groupId: string) {
    await this.getGroup(actor, groupId);

    return this.prisma.groupPermission.findMany({
      where: { groupId },
      select: {
        id: true,
        groupId: true,
        permissionId: true,
        effect: true,
        active: true,
        permission: { select: { code: true, name: true, active: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setPermission(actor: PolicyActor, groupId: string, input: SetGroupPermissionDto) {
    const policies = await this.setPermissionsBatch(actor, groupId, {
      permissionCodes: [input.permissionCode],
      effect: input.effect,
    });
    return policies[0];
  }

  async setPermissionsBatch(
    actor: PolicyActor,
    groupId: string,
    input: SetGroupPermissionsBatchDto,
  ) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId, true);
      const codes = [...new Set(input.permissionCodes)];
      if (
        codes.length === 0 ||
        codes.length > 100 ||
        codes.length !== input.permissionCodes.length
      ) {
        throw new BadRequestException({
          code: 'INVALID_PERMISSION',
          message: 'Invalid permission selection.',
        });
      }
      const catalog = await tx.permission.findMany({
        where: { code: { in: codes }, active: true },
        select: { id: true, code: true },
      });
      if (catalog.length !== codes.length) {
        throw new BadRequestException({
          code: 'INVALID_PERMISSION',
          message: 'Unknown or inactive permission.',
        });
      }
      const ids = new Map(catalog.map((permission) => [permission.code, permission.id]));
      const policies = [];
      for (const code of codes) {
        const permissionId = ids.get(code)!;
        const policy = await tx.groupPermission.upsert({
          where: { groupId_permissionId: { groupId, permissionId } },
          create: { groupId, permissionId, effect: input.effect, active: true },
          update: { effect: input.effect, active: true },
        });
        await this.audit(tx, actor, 'POLICY_SET', 'GroupPermission', policy.id);
        policies.push(policy);
      }
      return policies;
    });
  }

  async removePermission(actor: PolicyActor, groupId: string, permissionCode: string) {
    return this.mutate(async (tx) => {
      await this.requireGroup(tx, actor, groupId);

      const policy = await tx.groupPermission.findFirst({
        where: { groupId, permission: { code: permissionCode } },
      });

      if (!policy) {
        this.notFound();
      }

      const updated = await tx.groupPermission.update({
        where: { id: policy.id },
        data: { active: false },
      });

      await this.audit(tx, actor, 'POLICY_REMOVED', 'GroupPermission', updated.id);

      return updated;
    });
  }
}
