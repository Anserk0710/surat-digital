import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const specificationPath = path.join(root, 'packages/api-contracts/openapi.json');

interface Operation {
  responses?: Record<string, unknown>;
}

interface Specification {
  openapi: string;
  paths: Record<string, Record<string, Operation>>;
  components: {
    schemas: Record<string, unknown>;
  };
}

function readSpecification(): Specification {
  return JSON.parse(fs.readFileSync(specificationPath, 'utf8')) as Specification;
}

describe('I01 OpenAPI generated contract', () => {
  it('documents searchable group members and atomic permission batches', () => {
    const document = readSpecification();
    expect(
      document.paths['/api/v1/group-policy/groups/{groupId}/member-candidates']?.get,
    ).toBeDefined();
    expect(
      document.paths['/api/v1/group-policy/groups/{groupId}/permissions/batch']?.post,
    ).toBeDefined();
    expect(document.components.schemas.SetGroupPermissionsBatchDto).toBeDefined();
  });

  it('documents the P08 document draft API', () => {
    const document = readSpecification();
    for (const [route, method] of [
      ['/api/v1/document-types', 'get'],
      ['/api/v1/document-subtypes', 'get'],
      ['/api/v1/documents/issuer-scopes', 'get'],
      ['/api/v1/documents', 'post'],
      ['/api/v1/documents', 'get'],
      ['/api/v1/documents/{documentId}', 'get'],
      ['/api/v1/documents/{documentId}', 'patch'],
    ] as const) {
      expect(document.paths[route]?.[method]).toBeDefined();
    }
  });

  it('generates an OpenAPI 3 specification', () => {
    const document = readSpecification();

    expect(document.openapi).toMatch(/^3\./);
  });

  it.each([
    ['/api/v1/auth/login', 'post', '200'],
    ['/api/v1/auth/refresh', 'post', '200'],
    ['/api/v1/auth/logout', 'post', '204'],
    ['/api/v1/auth/me', 'get', '200'],
  ])('documents %s %s', (route, method, status) => {
    const document = readSpecification();

    expect(document.paths[route]?.[method]).toBeDefined();
    expect(document.paths[route]?.[method]?.responses).toHaveProperty(status);
  });

  it.each([
    'LoginRequestDto',
    'AuthLoginResponseDto',
    'AuthRefreshResponseDto',
    'AuthMeResponseDto',
    'AuthUserDto',
    'AuthCompanyDto',
  ])('generates schema %s', (schema) => {
    const document = readSpecification();

    expect(document.components.schemas).toHaveProperty(schema);
  });

  it('documents CSRF bootstrap endpoint', () => {
    const document = readSpecification();

    expect(document.paths['/api/v1/auth/csrf']?.get).toBeDefined();

    expect(document.components.schemas).toHaveProperty('AuthCsrfResponseDto');
  });

  it('documents authentication rate limiting', () => {
    const document = readSpecification();

    expect(document.paths['/api/v1/auth/login']?.post?.responses).toHaveProperty('429');

    expect(document.paths['/api/v1/auth/refresh']?.post?.responses).toHaveProperty('429');
  });

  it.each([
    ['/api/v1/group-policy/groups', 'get'],
    ['/api/v1/group-policy/groups', 'post'],
    ['/api/v1/group-policy/permissions', 'get'],
    ['/api/v1/group-policy/me/effective-permissions', 'get'],
    ['/api/v1/group-policy/groups/{groupId}/members', 'post'],
    ['/api/v1/group-policy/groups/{groupId}/permissions', 'post'],
  ])('documents P06 endpoint %s %s', (endpoint, method) => {
    const specification = readSpecification();

    expect(specification.paths[endpoint]?.[method]).toBeDefined();
  });

  it.each([
    'CreateGroupDto',
    'UpdateGroupDto',
    'SetGroupActiveDto',
    'AddGroupMemberDto',
    'SetGroupPermissionDto',
    'GroupResponseDto',
    'GroupMemberResponseDto',
    'GroupPermissionResponseDto',
    'EffectivePermissionResponseDto',
  ])('generates P06 schema %s', (schema) => {
    const specification = readSpecification();

    expect(specification.components.schemas).toHaveProperty(schema);
  });

  it('documents the P07 RLS POC endpoint', () => {
    const document = readSpecification();

    expect(document.paths['/api/v1/rls-poc/resources/{id}']?.get).toBeDefined();

    expect(document.paths['/api/v1/rls-poc/resources/{id}']?.get?.responses).toHaveProperty('200');
  });
});
