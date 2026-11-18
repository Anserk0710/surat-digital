import type { components } from '@surat-digital/api-client';

export type AuthUser = components['schemas']['AuthUserDto'];
export type LoginInput = components['schemas']['LoginRequestDto'];
export type LoginResponse = components['schemas']['AuthLoginResponseDto'];
export type RefreshResponse = components['schemas']['AuthRefreshResponseDto'];
export type MeResponse = components['schemas']['AuthMeResponseDto'];

export type Permission = {
  code: string;
  decision: 'ALLOW' | 'DENY';
};

export type PermissionCatalogItem = {
  id: string;
  code: string;
  description?: string;
};

export type CompanyItem = {
  id: string;
  code: string;
  name: string;
  active?: boolean;
};

export type OfficeItem = {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  timezone: string;
  active?: boolean;
};

export type DivisionItem = {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  active?: boolean;
};

export type JobTitleItem = {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  active?: boolean;
};

export type OfficeDivisionItem = {
  id: string;
  officeId: string;
  divisionId: string;
  active?: boolean;
  office?: { code: string; name: string };
  division?: { code: string; name: string };
};

export type AssignmentItem = {
  id: string;
  employeeId: string;
  officeDivisionId: string;
  jobTitleId?: string | null;
  active?: boolean;
  employee?: { fullName: string; employeeNumber: string };
  jobTitle?: { name: string };
};

export type UserItem = {
  id: string;
  companyId?: string;
  employeeNumber: string;
  username: string;
  fullName: string;
  email: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt?: string;
};

export type GroupItem = {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  active?: boolean;
};

export type GroupMemberItem = {
  id: string;
  groupId: string;
  employeeId: string;
  employee?: {
    fullName: string;
    employeeNumber: string;
    email: string;
  };
};

export type GroupPermissionItem = {
  id: string;
  groupId: string;
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
};

export type RecordItem = {
  id: string;
  code?: string;
  name?: string;
  active?: boolean;
  timezone?: string;
  fullName?: string;
  status?: string;
  employeeNumber?: string;
  email?: string;
  username?: string;
  employeeId?: string;
  officeId?: string;
  divisionId?: string;
  officeDivisionId?: string;
  jobTitleId?: string | null;
  permissionId?: string;
  effect?: 'ALLOW' | 'DENY';
  [key: string]: unknown;
};
