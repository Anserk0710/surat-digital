import { SetMetadata } from '@nestjs/common';

export const POLICY_REQUIREMENT_KEY = 'group-policy:requirement';

export interface PolicyRequirement {
  any?: string[];
  all?: string[];
  authenticatedOnly?: boolean;
  platformAdminAllowed?: boolean;
  platformAdminOnly?: boolean;
}

export function RequirePlatformAdmin() {
  return SetMetadata(POLICY_REQUIREMENT_KEY, {
    platformAdminOnly: true,
  } satisfies PolicyRequirement);
}

export function RequirePlatformOrPolicyAny(...codes: string[]) {
  return SetMetadata(POLICY_REQUIREMENT_KEY, {
    any: codes,
    platformAdminAllowed: true,
  } satisfies PolicyRequirement);
}

export function RequirePolicyAny(...codes: string[]) {
  return SetMetadata(POLICY_REQUIREMENT_KEY, {
    any: codes,
  } satisfies PolicyRequirement);
}

export function RequirePolicyAll(...codes: string[]) {
  return SetMetadata(POLICY_REQUIREMENT_KEY, {
    all: codes,
  } satisfies PolicyRequirement);
}

export function RequireAuthenticatedPolicy() {
  return SetMetadata(POLICY_REQUIREMENT_KEY, {
    authenticatedOnly: true,
  } satisfies PolicyRequirement);
}
