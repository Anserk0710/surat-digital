import { describe, expect, it } from 'vitest';

import { hasAnyAllowedPermission } from './organization-permissions.js';

describe('P05-T01 organization permission policy', () => {
  it('uses default deny', () => {
    expect(hasAnyAllowedPermission([], ['System.Configure'])).toBe(false);
  });

  it('accepts explicit ALLOW', () => {
    expect(
      hasAnyAllowedPermission(
        [{ code: 'System.Configure', effect: 'ALLOW' }],
        ['System.Configure'],
      ),
    ).toBe(true);
  });

  it('uses DENY over ALLOW', () => {
    expect(
      hasAnyAllowedPermission(
        [
          { code: 'System.Configure', effect: 'ALLOW' },
          { code: 'System.Configure', effect: 'DENY' },
        ],
        ['System.Configure'],
      ),
    ).toBe(false);
  });

  it('accepts any independently allowed read permission', () => {
    expect(
      hasAnyAllowedPermission(
        [
          { code: 'User.View', effect: 'ALLOW' },
          { code: 'System.Configure', effect: 'DENY' },
        ],
        ['User.View', 'System.Configure'],
      ),
    ).toBe(true);
  });

  it('does not infer permission from job title', () => {
    expect(hasAnyAllowedPermission([], ['User.Manage'])).toBe(false);
  });
});
