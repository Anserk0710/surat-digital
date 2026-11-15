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
});
