import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service.js';
import { createPrismaClient } from '../database/prisma-client.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreateAssignmentDto,
  CreateCompanyDto,
  CreateMasterDto,
  CreateOfficeDto,
  CreateOfficeDivisionDto,
  UpdateOfficeDivisionDto,
  UpdateAssignmentDto,
  UpdateCompanyDto,
  UpdateMasterDto,
  UpdateOfficeDto,
} from './organization.dto.js';
import type { OrganizationActor } from './organization-access.guard.js';
import {
  parseCalendarDate,
  validateDateRange,
  validateIanaTimezone,
} from './organization-validation.js';

type MasterKind = 'office' | 'division' | 'jobTitle';

const ORGANIZATION_CONFLICT_CODES = new Set([
  'P2002',
  'P2003',
  'P2004',
  'P2010',
  '23503',
  '23505',
  '23514',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOrganizationConflictError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  if (typeof error.code === 'string' && ORGANIZATION_CONFLICT_CODES.has(error.code)) {
    return true;
  }

  if (error.code !== 'P2039' || !isRecord(error.meta)) {
    return false;
  }

  const driverError = error.meta.driverAdapterError;

  if (!isRecord(driverError) || !isRecord(driverError.cause)) {
    return false;
  }

  const { code, originalCode } = driverError.cause;

  return [code, originalCode].some(
    (value) => typeof value === 'string' && ORGANIZATION_CONFLICT_CODES.has(value),
  );
}

function isForeignKeyConflictError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }
  if (error.code === 'P2003' || error.code === '23503') {
    return true;
  }
  const driver = isRecord(error.meta) ? error.meta.driverAdapterError : null;
  const cause = isRecord(driver) ? driver.cause : null;
  return isRecord(cause) && (cause.code === '23503' || cause.originalCode === '23503');
}

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  private notFound(): never {
    throw new NotFoundException({
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'Organization resource not found.',
    });
  }

  private conflict(message = 'Organization integrity conflict.'): never {
    throw new ConflictException({
      code: 'ORGANIZATION_CONFLICT',
      message,
    });
  }

  private async write<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isForeignKeyConflictError(error)) {
        this.conflict('Data masih dipakai. Nonaktifkan atau lepaskan relasinya terlebih dahulu.');
      }
      if (isOrganizationConflictError(error)) {
        this.conflict();
      }

      throw error;
    }
  }

  private async writeChange<T extends { id: string }>(
    actor: OrganizationActor,
    targetType: string,
    action: string,
    before: { id: string } | null,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    companyId = actor.companyId,
    forceDeactivation = false,
  ): Promise<T> {
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        if (forceDeactivation) {
          await tx.$queryRaw`SELECT set_config('app.organization_force_deactivate', 'true', true)`;
        }
        const result = await operation(tx);
        await tx.organizationChange.create({
          data: {
            companyId,
            actorEmployeeId: actor.employeeId,
            targetType,
            targetId: result.id,
            action,
            before: before ? JSON.parse(JSON.stringify(before)) : undefined,
            after: action === 'DELETE' ? undefined : JSON.parse(JSON.stringify(result)),
          },
        });
        return result;
      }),
    );
  }

  private async deleteWithDependents<T extends { id: string }>(
    actor: OrganizationActor,
    targetType: string,
    before: T,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const directUrl = this.config.get<string>('DIRECT_URL');
    if (!directUrl) {
      throw new ServiceUnavailableException('Organization deletion is not configured.');
    }
    const expectedCompany = await this.getCompany(actor);
    const direct = createPrismaClient(directUrl);
    try {
      return await direct.$transaction(
        async (tx) => {
          const company = await tx.company.findUnique({
            where: { id: actor.companyId },
            select: { code: true },
          });
          if (!company || company.code !== expectedCompany.code) {
            throw new ServiceUnavailableException('Organization deletion database does not match.');
          }
          const result = await operation(tx);
          await tx.organizationChange.create({
            data: {
              companyId: actor.companyId,
              actorEmployeeId: actor.employeeId,
              targetType,
              targetId: before.id,
              action: 'DELETE',
              before: JSON.parse(JSON.stringify(before)),
            },
          });
          return result;
        },
        { timeout: 120_000 },
      );
    } finally {
      await direct.$disconnect();
    }
  }

  async listChanges(actor: OrganizationActor, targetType: string, targetId: string) {
    const types = [
      'companies',
      'offices',
      'divisions',
      'job-titles',
      'office-divisions',
      'assignments',
    ];
    if (!types.includes(targetType)) {
      this.notFound();
    }
    if (targetType === 'companies' && !actor.isPlatformAdmin && targetId !== actor.companyId) {
      this.notFound();
    }
    return this.prisma.organizationChange.findMany({
      where: {
        companyId: targetType === 'companies' && actor.isPlatformAdmin ? targetId : actor.companyId,
        targetType,
        targetId,
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  // ---------------------------------------------------------
  // Company — scoped to the authenticated employee's company.
  // ---------------------------------------------------------

  async listCompanies(actor: OrganizationActor) {
    return actor.isPlatformAdmin
      ? this.prisma.company.findMany({ orderBy: { code: 'asc' } })
      : [await this.getCompany(actor)];
  }

  async getCompany(actor: OrganizationActor, id = actor.companyId) {
    if (!actor.isPlatformAdmin && id !== actor.companyId) {
      this.notFound();
    }
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      this.notFound();
    }

    return company;
  }

  async createCompany(actor: OrganizationActor, input: CreateCompanyDto) {
    if (!actor.isPlatformAdmin) {
      this.notFound();
    }
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (!serviceRoleKey || !supabaseUrl) {
      throw new ServiceUnavailableException(
        'Company administrator invitations are not configured.',
      );
    }
    if (await this.prisma.company.findUnique({ where: { code: input.code } })) {
      this.conflict('Company code is already used.');
    }
    const email = input.adminEmail.trim().toLowerCase();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const invited = await admin.auth.admin.inviteUserByEmail(email);
    if (invited.error || !invited.data.user) {
      throw new ServiceUnavailableException('Company administrator invitation failed.');
    }
    try {
      const adminPermissions = [
        'System.Configure',
        'User.Manage',
        'User.View',
        'Group.View',
        'Group.Manage',
      ];
      const permissions = await this.prisma.permission.findMany({
        where: { code: { in: adminPermissions }, active: true },
        select: { id: true, code: true },
      });
      if (permissions.length !== adminPermissions.length) {
        throw new ServiceUnavailableException('Administrator permissions are not configured.');
      }
      return await this.write(() =>
        this.prisma.$transaction(async (tx) => {
          const company = await tx.company.create({
            data: { code: input.code, name: input.name },
          });
          const username = email.slice(0, 100);
          const employee = await tx.employee.create({
            data: {
              companyId: company.id,
              authUserId: invited.data.user!.id,
              employeeNumber: 'ADMIN-001',
              username,
              usernameNormalized: username,
              email,
              emailNormalized: email,
              fullName: input.adminName.trim(),
              status: 'ACTIVE',
            },
          });
          const group = await tx.group.create({
            data: {
              companyId: company.id,
              code: 'COMPANY_ADMIN',
              name: 'Administrator Perusahaan',
            },
          });
          await tx.employeeGroup.create({ data: { employeeId: employee.id, groupId: group.id } });
          await tx.groupPermission.createMany({
            data: permissions.map((permission) => ({
              groupId: group.id,
              permissionId: permission.id,
              effect: 'ALLOW',
            })),
          });
          await tx.groupPolicyAudit.create({
            data: {
              companyId: company.id,
              actorEmployeeId: actor.employeeId,
              action: 'COMPANY_ADMIN_PROVISIONED',
              targetType: 'GROUP',
              targetId: group.id,
            },
          });
          await tx.organizationChange.create({
            data: {
              companyId: company.id,
              actorEmployeeId: actor.employeeId,
              targetType: 'companies',
              targetId: company.id,
              action: 'CREATE',
              after: { code: company.code, name: company.name },
            },
          });
          return company;
        }),
      );
    } catch (error) {
      await admin.auth.admin.deleteUser(invited.data.user.id);
      throw error;
    }
  }

  async updateCompany(
    actor: OrganizationActor,
    id: string,
    input: UpdateCompanyDto,
    force = false,
  ) {
    const before = await this.getCompany(actor, id);
    const pendingDeletion = await this.prisma.organizationChange.findFirst({
      where: {
        companyId: id,
        targetType: 'companies',
        targetId: id,
        action: 'DELETE_PENDING_AUTH',
      },
      select: { id: true },
    });
    if (pendingDeletion) {
      this.conflict('Company deletion is in progress. Retry permanent deletion.');
    }
    if (input.active !== undefined && !actor.isPlatformAdmin) {
      throw new BadRequestException('Only platform administrators can change company status.');
    }
    if (input.code !== undefined && !actor.isPlatformAdmin) {
      throw new BadRequestException('Only platform administrators can change company code.');
    }
    if (input.active === false && id === actor.companyId && actor.isPlatformAdmin) {
      throw new BadRequestException('Cannot deactivate the platform administrator company.');
    }
    if (input.active === false) {
      await this.assertCompanyForce(id, force);
    }

    return this.writeChange(
      actor,
      'companies',
      'UPDATE',
      before,
      (tx) =>
        tx.company.update({
          where: { id },
          data: input,
        }),
      id,
      input.active === false && force,
    );
  }

  private async assertCompanyForce(id: string, force: boolean) {
    const activity = await this.prisma.employee.count({ where: { companyId: id } });
    if (activity > 0 && !force) {
      throw new BadRequestException({
        code: 'COMPANY_ACTIVITY_CONFIRMATION_REQUIRED',
        message: 'Confirm the action for a company with activity.',
      });
    }
  }

  async deactivateCompany(actor: OrganizationActor, id: string, force = false) {
    if (!actor.isPlatformAdmin || id === actor.companyId) {
      throw new BadRequestException('Platform administrator cannot deactivate this company.');
    }
    return this.updateCompany(actor, id, { active: false }, force);
  }

  async deleteCompanyPermanently(actor: OrganizationActor, id: string, force = false) {
    if (!actor.isPlatformAdmin || id === actor.companyId) {
      throw new BadRequestException('Platform administrator cannot delete this company.');
    }
    const before = await this.getCompany(actor, id);
    await this.assertCompanyForce(id, force);
    const directUrl = this.config.get<string>('DIRECT_URL');
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!directUrl || !supabaseUrl || !serviceKey) {
      throw new ServiceUnavailableException('Company deletion is not configured.');
    }
    const direct = createPrismaClient(directUrl);
    try {
      const directCompany = await direct.company.findUnique({ where: { id } });
      if (!directCompany || directCompany.code !== before.code) {
        throw new ServiceUnavailableException('Company deletion database does not match.');
      }
      const existingCleanup = await direct.organizationChange.findFirst({
        where: {
          companyId: id,
          targetType: 'companies',
          targetId: id,
          action: 'DELETE_PENDING_AUTH',
        },
        orderBy: { occurredAt: 'desc' },
      });
      let authUserIds: string[];
      if (existingCleanup) {
        authUserIds = Array.isArray(existingCleanup.after)
          ? existingCleanup.after.filter((value): value is string => typeof value === 'string')
          : [];
      } else {
        authUserIds = await direct.$transaction(
          async (tx) => {
            const employees = await tx.employee.findMany({
              where: { companyId: id },
              select: { authUserId: true },
            });
            await tx.document.deleteMany({ where: { companyId: id } });
            await tx.rlsPocResource.deleteMany({
              where: { OR: [{ ownerEmployee: { companyId: id } }, { office: { companyId: id } }] },
            });
            await tx.authSession.deleteMany({ where: { employee: { companyId: id } } });
            await tx.groupPermission.deleteMany({ where: { group: { companyId: id } } });
            await tx.employeeGroup.deleteMany({ where: { employee: { companyId: id } } });
            await tx.employeeAssignment.deleteMany({ where: { employee: { companyId: id } } });
            await tx.officeDivision.deleteMany({ where: { office: { companyId: id } } });
            await tx.group.deleteMany({ where: { companyId: id } });
            await tx.employee.deleteMany({ where: { companyId: id } });
            await tx.office.deleteMany({ where: { companyId: id } });
            await tx.division.deleteMany({ where: { companyId: id } });
            await tx.jobTitle.deleteMany({ where: { companyId: id } });
            await tx.groupPolicyAudit.deleteMany({ where: { companyId: id } });
            await tx.organizationChange.deleteMany({ where: { companyId: id } });
            await tx.$queryRaw`SELECT set_config('app.organization_force_deactivate', 'true', true)`;
            await tx.company.update({ where: { id }, data: { active: false } });
            const ids = employees
              .map((employee) => employee.authUserId)
              .filter((value): value is string => Boolean(value));
            await tx.organizationChange.create({
              data: {
                companyId: id,
                actorEmployeeId: actor.employeeId,
                targetType: 'companies',
                targetId: id,
                action: 'DELETE_PENDING_AUTH',
                before: JSON.parse(JSON.stringify(before)),
                after: ids,
              },
            });
            return ids;
          },
          { timeout: 120_000 },
        );
      }
      const auth = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      for (const authUserId of authUserIds) {
        const result = await auth.auth.admin.deleteUser(authUserId);
        if (result.error && result.error.status !== 404) {
          throw new ServiceUnavailableException(
            'Company data was cleared; authentication cleanup is pending. Retry deletion.',
          );
        }
      }
      await direct.$transaction(async (tx) => {
        await tx.company.delete({ where: { id } });
        await tx.organizationChange.deleteMany({
          where: { companyId: id, action: 'DELETE_PENDING_AUTH' },
        });
        await tx.organizationChange.create({
          data: {
            companyId: id,
            actorEmployeeId: actor.employeeId,
            targetType: 'companies',
            targetId: id,
            action: 'DELETE',
            before: JSON.parse(JSON.stringify(before)),
          },
        });
      });
      return before;
    } finally {
      await direct.$disconnect();
    }
  }

  // ---------------------------------------------------------
  // Common Office / Division / JobTitle operations.
  // ---------------------------------------------------------

  async listMasters(actor: OrganizationActor, kind: MasterKind) {
    const where = { companyId: actor.companyId };

    switch (kind) {
      case 'office':
        return this.prisma.office.findMany({
          where,
          orderBy: { code: 'asc' },
        });

      case 'division':
        return this.prisma.division.findMany({
          where,
          orderBy: { code: 'asc' },
        });

      case 'jobTitle':
        return this.prisma.jobTitle.findMany({
          where,
          orderBy: { code: 'asc' },
        });
    }
  }

  async getMaster(actor: OrganizationActor, kind: MasterKind, id: string) {
    const where = {
      id,
      companyId: actor.companyId,
    };

    let result;

    switch (kind) {
      case 'office':
        result = await this.prisma.office.findFirst({ where });
        break;

      case 'division':
        result = await this.prisma.division.findFirst({ where });
        break;

      case 'jobTitle':
        result = await this.prisma.jobTitle.findFirst({ where });
        break;
    }

    if (!result) {
      this.notFound();
    }

    return result;
  }

  async createOffice(actor: OrganizationActor, input: CreateOfficeDto) {
    const timezone = validateIanaTimezone(input.timezone);

    return this.writeChange(actor, 'offices', 'CREATE', null, (tx) =>
      tx.office.create({
        data: {
          companyId: actor.companyId,
          code: input.code,
          name: input.name,
          timezone,
        },
      }),
    );
  }

  async createMaster(
    actor: OrganizationActor,
    kind: 'division' | 'jobTitle',
    input: CreateMasterDto,
  ) {
    const data = {
      companyId: actor.companyId,
      code: input.code,
      name: input.name,
    };

    return this.writeChange(
      actor,
      kind === 'division' ? 'divisions' : 'job-titles',
      'CREATE',
      null,
      (tx) => (kind === 'division' ? tx.division.create({ data }) : tx.jobTitle.create({ data })),
    );
  }

  async updateMaster(
    actor: OrganizationActor,
    kind: MasterKind,
    id: string,
    input: UpdateMasterDto | UpdateOfficeDto,
    force = false,
  ) {
    const before = await this.getMaster(actor, kind, id);

    if ('timezone' in input && input.timezone !== undefined) {
      validateIanaTimezone(input.timezone);
    }

    if (input.active === true) {
      const company = await this.getCompany(actor);

      if (!company.active) {
        this.conflict('Company is inactive.');
      }
    }

    return this.writeChange(
      actor,
      kind === 'jobTitle' ? 'job-titles' : `${kind}s`,
      'UPDATE',
      before,
      async (tx) => {
        switch (kind) {
          case 'office':
            return tx.office.update({
              where: { id },
              data: input,
            });

          case 'division':
            return tx.division.update({
              where: { id },
              data: input,
            });

          case 'jobTitle':
            return tx.jobTitle.update({
              where: { id },
              data: input,
            });
        }
      },
      actor.companyId,
      input.active === false && force,
    );
  }

  async deactivateMaster(actor: OrganizationActor, kind: MasterKind, id: string, force = false) {
    return this.updateMaster(actor, kind, id, { active: false }, force);
  }

  async deleteMasterPermanently(actor: OrganizationActor, kind: MasterKind, id: string) {
    const before = await this.getMaster(actor, kind, id);

    return this.deleteWithDependents(
      actor,
      kind === 'jobTitle' ? 'job-titles' : `${kind}s`,
      before,
      async (tx) => {
        switch (kind) {
          case 'office': {
            await tx.document.deleteMany({
              where: { companyId: actor.companyId, issuerOfficeId: id },
            });
            await tx.rlsPocResource.deleteMany({ where: { officeId: id } });
            await tx.employeeAssignment.deleteMany({ where: { officeDivision: { officeId: id } } });
            await tx.officeDivision.deleteMany({ where: { officeId: id } });
            return tx.office.delete({ where: { id } });
          }
          case 'division': {
            await tx.document.deleteMany({
              where: { companyId: actor.companyId, issuerDivisionId: id },
            });
            await tx.employeeAssignment.deleteMany({
              where: { officeDivision: { divisionId: id } },
            });
            await tx.officeDivision.deleteMany({ where: { divisionId: id } });
            return tx.division.delete({ where: { id } });
          }
          case 'jobTitle': {
            await tx.employeeAssignment.deleteMany({ where: { jobTitleId: id } });
            return tx.jobTitle.delete({ where: { id } });
          }
        }
      },
    );
  }

  // ---------------------------------------------------------
  // OfficeDivision — must belong to the same company.
  // ---------------------------------------------------------

  async listOfficeDivisions(actor: OrganizationActor) {
    return this.prisma.officeDivision.findMany({
      where: {
        office: { companyId: actor.companyId },
        division: { companyId: actor.companyId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOfficeDivision(actor: OrganizationActor, id: string) {
    const result = await this.prisma.officeDivision.findFirst({
      where: {
        id,
        office: { companyId: actor.companyId },
        division: { companyId: actor.companyId },
      },
    });

    if (!result) {
      this.notFound();
    }

    return result;
  }

  async createOfficeDivision(actor: OrganizationActor, input: CreateOfficeDivisionDto) {
    return this.writeChange(actor, 'office-divisions', 'CREATE', null, async (tx) => {
      // Locks parent rows, including in concurrent deactivation.
      const valid = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT o.id
          FROM public.offices o
          JOIN public.divisions d
            ON d.id = ${input.divisionId}::uuid
           AND d.company_id = o.company_id
          JOIN public.companies c
            ON c.id = o.company_id
          WHERE o.id = ${input.officeId}::uuid
            AND o.company_id = ${actor.companyId}::uuid
            AND o.active = true
            AND d.active = true
            AND c.active = true
          FOR UPDATE OF o, d
        `;

      if (valid.length !== 1) {
        throw new BadRequestException({
          code: 'INVALID_OFFICE_DIVISION',
          message: 'Office and Division must be active and belong to the same company.',
        });
      }

      return tx.officeDivision.create({
        data: {
          officeId: input.officeId,
          divisionId: input.divisionId,
        },
      });
    });
  }

  async updateOfficeDivision(
    actor: OrganizationActor,
    id: string,
    input: UpdateOfficeDivisionDto,
    force = false,
  ) {
    const existing = await this.getOfficeDivision(actor, id);
    const officeId = input.officeId ?? existing.officeId;
    const divisionId = input.divisionId ?? existing.divisionId;

    return this.writeChange(
      actor,
      'office-divisions',
      'UPDATE',
      existing,
      async (tx) => {
        if (
          input.active !== false ||
          input.officeId !== undefined ||
          input.divisionId !== undefined
        ) {
          const parents = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT o.id
            FROM public.offices o
            JOIN public.divisions d ON d.id = ${divisionId}::uuid
            JOIN public.companies c ON c.id = o.company_id
            WHERE o.id = ${officeId}::uuid
              AND o.company_id = ${actor.companyId}::uuid
              AND d.company_id = o.company_id
              AND o.active
              AND d.active
              AND c.active
            FOR UPDATE OF o, d
          `;

          if (parents.length !== 1) {
            this.conflict('Parent organization is inactive.');
          }
        }

        return tx.officeDivision.update({
          where: { id },
          data: input,
        });
      },
      actor.companyId,
      input.active === false && force,
    );
  }

  async deleteOfficeDivisionPermanently(actor: OrganizationActor, id: string) {
    const before = await this.getOfficeDivision(actor, id);
    return this.deleteWithDependents(actor, 'office-divisions', before, async (tx) => {
      await tx.document.deleteMany({
        where: {
          companyId: actor.companyId,
          issuerOfficeId: before.officeId,
          issuerDivisionId: before.divisionId,
        },
      });
      await tx.employeeAssignment.deleteMany({ where: { officeDivisionId: id } });
      return tx.officeDivision.delete({ where: { id } });
    });
  }

  // ---------------------------------------------------------
  // Employee assignments — tenant-scoped.
  // ---------------------------------------------------------

  async listAssignments(actor: OrganizationActor) {
    return this.prisma.employeeAssignment.findMany({
      where: {
        employee: { companyId: actor.companyId },
        officeDivision: {
          office: { companyId: actor.companyId },
          division: { companyId: actor.companyId },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAssignment(actor: OrganizationActor, id: string) {
    const result = await this.prisma.employeeAssignment.findFirst({
      where: {
        id,
        employee: { companyId: actor.companyId },
        officeDivision: {
          office: { companyId: actor.companyId },
          division: { companyId: actor.companyId },
        },
      },
    });

    if (!result) {
      this.notFound();
    }

    return result;
  }

  private async validateAssignmentParents(
    tx: Pick<PrismaService, '$queryRaw'>,
    actor: OrganizationActor,
    employeeId: string,
    officeDivisionId: string,
    jobTitleId?: string | null,
  ): Promise<void> {
    const valid = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT e.id
      FROM public.employees e
      JOIN public.office_divisions od
        ON od.id = ${officeDivisionId}::uuid
      JOIN public.offices o
        ON o.id = od.office_id
      JOIN public.divisions d
        ON d.id = od.division_id
      JOIN public.companies c
        ON c.id = e.company_id
      WHERE e.id = ${employeeId}::uuid
        AND e.company_id = ${actor.companyId}::uuid
        AND o.company_id = e.company_id
        AND d.company_id = e.company_id
        AND od.active
        AND o.active
        AND d.active
        AND c.active
      FOR UPDATE OF e, od, o, d
    `;

    if (valid.length !== 1) {
      throw new BadRequestException({
        code: 'INVALID_EMPLOYEE_ASSIGNMENT',
        message: 'Employee and organization must belong to the same active company.',
      });
    }

    if (jobTitleId) {
      const jobs = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM public.job_titles
        WHERE id = ${jobTitleId}::uuid
          AND company_id = ${actor.companyId}::uuid
          AND active = true
        FOR UPDATE
      `;

      if (jobs.length !== 1) {
        throw new BadRequestException({
          code: 'INVALID_JOB_TITLE',
          message: 'Job title must belong to the same active company.',
        });
      }
    }
  }

  async createAssignment(actor: OrganizationActor, input: CreateAssignmentDto) {
    const validFrom = parseCalendarDate(input.validFrom);
    const validUntil = parseCalendarDate(input.validUntil);

    validateDateRange(validFrom, validUntil);

    return this.writeChange(actor, 'assignments', 'CREATE', null, async (tx) => {
      await this.validateAssignmentParents(
        tx,
        actor,
        input.employeeId,
        input.officeDivisionId,
        input.jobTitleId,
      );

      return tx.employeeAssignment.create({
        data: {
          employeeId: input.employeeId,
          officeDivisionId: input.officeDivisionId,
          jobTitleId: input.jobTitleId ?? null,
          isPrimary: input.isPrimary ?? false,
          ...(validFrom !== undefined && { validFrom }),
          ...(validUntil !== undefined && { validUntil }),
          active: true,
        },
      });
    });
  }

  async updateAssignment(actor: OrganizationActor, id: string, input: UpdateAssignmentDto) {
    const existing = await this.getAssignment(actor, id);

    const validFrom = parseCalendarDate(input.validFrom);
    const validUntil = parseCalendarDate(input.validUntil);

    validateDateRange(
      validFrom === undefined ? existing.validFrom : validFrom,
      validUntil === undefined ? existing.validUntil : validUntil,
    );

    return this.writeChange(actor, 'assignments', 'UPDATE', existing, async (tx) => {
      const willRemainActive = input.active ?? existing.active;

      if (
        willRemainActive ||
        input.employeeId !== undefined ||
        input.officeDivisionId !== undefined ||
        input.jobTitleId !== undefined
      ) {
        await this.validateAssignmentParents(
          tx,
          actor,
          input.employeeId ?? existing.employeeId,
          input.officeDivisionId ?? existing.officeDivisionId,
          input.jobTitleId === undefined ? existing.jobTitleId : input.jobTitleId,
        );
      }

      return tx.employeeAssignment.update({
        where: { id },
        data: {
          ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
          ...(input.officeDivisionId !== undefined && { officeDivisionId: input.officeDivisionId }),
          ...(input.jobTitleId !== undefined && {
            jobTitleId: input.jobTitleId,
          }),
          ...(input.isPrimary !== undefined && {
            isPrimary: input.isPrimary,
          }),
          ...(validFrom !== undefined && { validFrom }),
          ...(validUntil !== undefined && { validUntil }),
          ...(input.active !== undefined && {
            active: input.active,
          }),
        },
      });
    });
  }

  async deactivateAssignment(actor: OrganizationActor, id: string) {
    return this.updateAssignment(actor, id, { active: false });
  }

  async deleteAssignmentPermanently(actor: OrganizationActor, id: string) {
    const before = await this.getAssignment(actor, id);
    return this.writeChange(actor, 'assignments', 'DELETE', before, (tx) =>
      tx.employeeAssignment.delete({ where: { id } }),
    );
  }
}
