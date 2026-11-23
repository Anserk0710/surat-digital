import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { PrismaService } from '../database/prisma.service.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import type { RegisterUserDto, UpdateProfileDto } from './users.dto.js';

const select = {
  id: true,
  employeeNumber: true,
  username: true,
  fullName: true,
  email: true,
  status: true,
} as const;
const normalize = (value: string) => value.normalize('NFKC').trim();

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private admin(): SupabaseClient {
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!key) {
      throw new ServiceUnavailableException('User provisioning is not configured.');
    }
    return createClient(this.config.getOrThrow<string>('SUPABASE_URL'), key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async register(input: RegisterUserDto) {
    const company = await this.prisma.company.findFirst({
      where: { code: normalize(input.companyCode), active: true },
      select: { id: true },
    });
    if (!company) {
      throw new BadRequestException('Registration could not be completed.');
    }
    const email = normalize(input.email).toLowerCase();
    const username = normalize(input.username);
    const employeeNumber = normalize(input.employeeNumber);
    const fullName = normalize(input.fullName);
    const duplicate = await this.prisma.employee.findFirst({
      where: {
        companyId: company.id,
        OR: [
          { emailNormalized: email },
          { usernameNormalized: username.toLowerCase() },
          { employeeNumber },
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Registration could not be completed.');
    }
    const auth = this.admin();
    const created = await auth.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new BadRequestException('Registration could not be completed.');
    }
    try {
      await this.prisma.employee.create({
        data: {
          companyId: company.id,
          authUserId: created.data.user.id,
          employeeNumber,
          username,
          usernameNormalized: username.toLowerCase(),
          email,
          emailNormalized: email,
          fullName,
          status: 'PENDING',
        },
      });
    } catch {
      await auth.auth.admin.deleteUser(created.data.user.id);
      throw new ConflictException('Registration could not be completed.');
    }
    return { accepted: true };
  }

  list(actor: PolicyActor) {
    return this.prisma.employee.findMany({
      where: { companyId: actor.companyId },
      select,
      orderBy: { fullName: 'asc' },
    });
  }

  profile(actor: PolicyActor) {
    return this.prisma.employee.findFirstOrThrow({
      where: { id: actor.employeeId, companyId: actor.companyId },
      select,
    });
  }

  updateProfile(actor: PolicyActor, input: UpdateProfileDto) {
    return this.prisma.employee.update({
      where: { id: actor.employeeId, companyId: actor.companyId },
      data: { fullName: normalize(input.fullName) },
      select,
    });
  }

  async setStatus(actor: PolicyActor, id: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId: actor.companyId },
      select: { id: true, authUserId: true, email: true, isPlatformAdmin: true },
    });
    if (!employee) {
      throw new NotFoundException('User not found.');
    }
    if (employee.isPlatformAdmin && status !== 'ACTIVE') {
      throw new BadRequestException('Platform administrators cannot be disabled here.');
    }
    let authUserId = employee.authUserId;
    if (status === 'ACTIVE' && !authUserId) {
      const invited = await this.admin().auth.admin.inviteUserByEmail(employee.email);
      if (invited.error || !invited.data.user) {
        throw new ServiceUnavailableException('Invitation failed.');
      }
      authUserId = invited.data.user.id;
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id, companyId: actor.companyId },
        data: { status, authUserId },
        select,
      });
      if (status !== 'ACTIVE') {
        await tx.authSession.updateMany({
          where: { employeeId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return updated;
    });
  }

  async deletePermanently(actor: PolicyActor, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId: actor.companyId },
      select: { id: true, authUserId: true, isPlatformAdmin: true },
    });
    if (!employee) {
      throw new NotFoundException('User not found.');
    }
    if (employee.isPlatformAdmin) {
      throw new BadRequestException('Platform administrators cannot be deleted here.');
    }
    if (employee.id === actor.employeeId) {
      throw new BadRequestException('Cannot delete your own account.');
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.employeeAssignment.deleteMany({ where: { employeeId: id } });
      await tx.employeeGroup.deleteMany({ where: { employeeId: id } });
      await tx.authSession.deleteMany({ where: { employeeId: id } });
      return tx.employee.delete({
        where: { id },
        select,
      });
    });

    if (employee.authUserId) {
      try {
        await this.admin().auth.admin.deleteUser(employee.authUserId);
      } catch {
        // Continue if user does not exist in Supabase auth
      }
    }

    return deleted;
  }

  async importExcel(
    actor: PolicyActor,
    file?: { size: number; originalname: string; buffer: Buffer },
  ) {
    if (!file || file.size > 2_000_000 || !file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('A .xlsx file of at most 2 MB is required.');
    }
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer as never);
    } catch {
      throw new BadRequestException('Invalid Excel file.');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 1001) {
      throw new BadRequestException('Excel must contain at most 1000 users.');
    }
    const headers = (sheet.getRow(1).values as unknown[]).map((v) =>
      String(v ?? '')
        .trim()
        .toLowerCase(),
    );
    const required = ['nip', 'username', 'email', 'nama'];
    if (required.some((key) => !headers.includes(key))) {
      throw new BadRequestException('Required columns: nip, username, email, nama.');
    }
    let created = 0;
    const errors: { row: number; message: string }[] = [];
    for (let row = 2; row <= sheet.rowCount; row++) {
      const values = Object.fromEntries(
        required.map((key) => [
          key,
          normalize(sheet.getRow(row).getCell(headers.indexOf(key)).text),
        ]),
      );
      if (required.some((key) => !values[key])) {
        errors.push({ row, message: 'Missing required value.' });
        continue;
      }
      const email = values.email!.toLowerCase();
      const username = values.username!;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-zA-Z0-9._-]+$/.test(username)) {
        errors.push({ row, message: 'Invalid email or username.' });
        continue;
      }
      try {
        await this.prisma.employee.create({
          data: {
            companyId: actor.companyId,
            employeeNumber: values.nip!,
            username,
            usernameNormalized: username.toLowerCase(),
            email,
            emailNormalized: email,
            fullName: values.nama!,
            status: 'PENDING',
          },
        });
        created++;
      } catch {
        errors.push({ row, message: 'Duplicate or invalid employee.' });
      }
    }
    return { created, errors };
  }
}
