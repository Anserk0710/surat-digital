import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LoginRequestDto } from './login-request.dto.js';

function createDto(identifier: string, password: string): LoginRequestDto {
  return Object.assign(new LoginRequestDto(), { identifier, password });
}

describe('LoginRequestDto', () => {
  it.each([
    ['a long email', `${'a'.repeat(140)}@example.com`, 'password'],
    ['a 35-character NIP', '1'.repeat(35), 'password'],
    ['a password longer than 64 characters', 'employee', 'p'.repeat(65)],
    ['a 1024-character password', 'employee', 'p'.repeat(1024)],
    ['a Unicode identifier', 'pegawai.日本語', 'password'],
  ])('accepts %s', async (_label, identifier, password) => {
    await expect(validate(createDto(identifier, password))).resolves.toHaveLength(0);
  });

  it.each([
    ['an identifier over 320 characters', 'a'.repeat(321), 'password'],
    ['a password over 1024 characters', 'employee', 'p'.repeat(1025)],
    ['an empty password', 'employee', ''],
    ['a space-only identifier', '   ', 'password'],
    ['a tab/newline-only identifier', '\t\n', 'password'],
  ])('rejects %s', async (_label, identifier, password) => {
    const errors = await validate(createDto(identifier, password));

    expect(errors.length).toBeGreaterThan(0);
  });
});
