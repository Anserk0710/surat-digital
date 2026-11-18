import { SetMetadata } from '@nestjs/common';

export const POLICY_REQUIREMENT_KEY = 'group-policy:requirement';

export interface PolicyRequirement {
  any?: string[];
  all?: string[];
  authenticatedOnly?: boolean;
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
