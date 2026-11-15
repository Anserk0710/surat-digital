import { describe, expect, it } from 'vitest';
import { permissionCatalog } from './permission-catalog.js';

describe('permission catalog', () => {
  it('contains the 21 baseline permissions', () => {
    expect(permissionCatalog).toHaveLength(21);
  });

  it('does not contain duplicate permission codes', () => {
    const codes = permissionCatalog.map((permission) => permission.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses stable permission code format', () => {
    for (const permission of permissionCatalog) {
      expect(permission.code).toMatch(/^[A-Z][A-Za-z]+(?:\.[A-Z][A-Za-z]+)+$/);
    }
  });
});
