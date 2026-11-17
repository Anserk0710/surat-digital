import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CreateAssignmentDto,
  CreateMasterDto,
  CreateOfficeDto,
  CreateOfficeDivisionDto,
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

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
      if (isOrganizationConflictError(error)) {
        this.conflict();
      }

      throw error;
    }
  }

  // ---------------------------------------------------------
  // Company — scoped to the authenticated employee's company.
  // ---------------------------------------------------------

  async getCompany(actor: OrganizationActor) {
    const company = await this.prisma.company.findUnique({
      where: { id: actor.companyId },
    });

    if (!company) {
      this.notFound();
    }

    return company;
  }

  async updateCompany(actor: OrganizationActor, input: UpdateCompanyDto) {
    await this.getCompany(actor);

    return this.write(() =>
      this.prisma.company.update({
        where: { id: actor.companyId },
        data: input,
      }),
    );
  }

  async deactivateCompany(actor: OrganizationActor) {
    return this.updateCompany(actor, { active: false });
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

    return this.write(() =>
      this.prisma.office.create({
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

    return this.write(() =>
      kind === 'division'
        ? this.prisma.division.create({ data })
        : this.prisma.jobTitle.create({ data }),
    );
  }

  async updateMaster(
    actor: OrganizationActor,
    kind: MasterKind,
    id: string,
    input: UpdateMasterDto | UpdateOfficeDto,
  ) {
    await this.getMaster(actor, kind, id);

    if ('timezone' in input && input.timezone !== undefined) {
      validateIanaTimezone(input.timezone);
    }

    if (input.active === true) {
      const company = await this.getCompany(actor);

      if (!company.active) {
        this.conflict('Company is inactive.');
      }
    }

    return this.write(async () => {
      switch (kind) {
        case 'office':
          return this.prisma.office.update({
            where: { id },
            data: input,
          });

        case 'division':
          return this.prisma.division.update({
            where: { id },
            data: input,
          });

        case 'jobTitle':
          return this.prisma.jobTitle.update({
            where: { id },
            data: input,
          });
      }
    });
  }

  async deactivateMaster(actor: OrganizationActor, kind: MasterKind, id: string) {
    return this.updateMaster(actor, kind, id, { active: false });
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
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
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
      }),
    );
  }

  async updateOfficeDivision(actor: OrganizationActor, id: string, active: boolean) {
    await this.getOfficeDivision(actor, id);

    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        if (active) {
          const parents = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT od.id
            FROM public.office_divisions od
            JOIN public.offices o ON o.id = od.office_id
            JOIN public.divisions d ON d.id = od.division_id
            JOIN public.companies c ON c.id = o.company_id
            WHERE od.id = ${id}::uuid
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
          data: { active },
        });
      }),
    );
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

    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
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
      }),
    );
  }

  async updateAssignment(actor: OrganizationActor, id: string, input: UpdateAssignmentDto) {
    const existing = await this.getAssignment(actor, id);

    const validFrom = parseCalendarDate(input.validFrom);
    const validUntil = parseCalendarDate(input.validUntil);

    validateDateRange(
      validFrom === undefined ? existing.validFrom : validFrom,
      validUntil === undefined ? existing.validUntil : validUntil,
    );

    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        const willRemainActive = input.active ?? existing.active;

        if (willRemainActive) {
          await this.validateAssignmentParents(
            tx,
            actor,
            existing.employeeId,
            existing.officeDivisionId,
            input.jobTitleId === undefined ? existing.jobTitleId : input.jobTitleId,
          );
        }

        return tx.employeeAssignment.update({
          where: { id },
          data: {
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
      }),
    );
  }

  async deactivateAssignment(actor: OrganizationActor, id: string) {
    return this.updateAssignment(actor, id, { active: false });
  }
}
