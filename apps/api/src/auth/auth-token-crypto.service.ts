import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TokenKind = 'access' | 'refresh';

@Injectable()
export class AuthTokenCryptoService {
  private readonly key: Buffer;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.key = Buffer.from(
      configService.getOrThrow<string>('AUTH_TOKEN_ENCRYPTION_KEY_BASE64'),
      'base64',
    );

    if (this.key.length !== 32) {
      throw new Error('Auth token encryption key must be exactly 32 bytes.');
    }
  }

  encrypt(value: string, kind: TokenKind): string {
    const iv = randomBytes(12);

    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    cipher.setAAD(this.createAdditionalData(kind));

    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(encoded: string, kind: TokenKind): string {
    const [version, ivEncoded, authTagEncoded, ciphertextEncoded] = encoded.split('.');

    if (version !== 'v1' || !ivEncoded || !authTagEncoded || !ciphertextEncoded) {
      throw new Error('Invalid encrypted token format.');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivEncoded, 'base64url'));

    decipher.setAAD(this.createAdditionalData(kind));

    decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private createAdditionalData(kind: TokenKind): Buffer {
    return Buffer.from(`surat-digital:p03:${kind}:v1`, 'utf8');
  }
}
