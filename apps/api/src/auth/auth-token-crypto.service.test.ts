import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AuthTokenCryptoService } from './auth-token-crypto.service.js';
function createService(): AuthTokenCryptoService {
  const config = new ConfigService({
    AUTH_TOKEN_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64'),
  });

  return new AuthTokenCryptoService(config);
}

describe('AuthTokenCryptoService', () => {
  it('encrypts and decrypts an access token', () => {
    const service = createService();

    const encrypted = service.encrypt('access-token-value', 'access');

    expect(encrypted).not.toContain('access-token-value');

    expect(service.decrypt(encrypted, 'access')).toBe('access-token-value');
  });

  it('does not allow access ciphertext to be used as refresh ciphertext', () => {
    const service = createService();

    const encrypted = service.encrypt('secret', 'access');

    expect(() => service.decrypt(encrypted, 'refresh')).toThrow();
  });
});
