import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_PERMISSIONS_KEY = 'organization:permissions';

export type OrganizationPermission = 'System.Configure' | 'User.View' | 'User.Manage';

export interface PermissionRow {
  code: string;
  effect: 'ALLOW' | 'DENY';
}

export const RequireOrganizationPermissions = (...codes: OrganizationPermission[]) =>
  SetMetadata(ORGANIZATION_PERMISSIONS_KEY, codes);

export function hasAnyAllowedPermission(
  rows: PermissionRow[],
  required: readonly OrganizationPermission[],
): boolean {
  if (required.length === 0) {
    return false;
  }

  return required.some((code) => {
    const matching = rows.filter((row) => row.code === code);

    if (matching.some((row) => row.effect === 'DENY')) {
      return false;
    }

    return matching.some((row) => row.effect === 'ALLOW');
  });
}
