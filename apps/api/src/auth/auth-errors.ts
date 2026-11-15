import { UnauthorizedException } from '@nestjs/common';

export function invalidCredentialsException(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials.',
  });
}

export function authenticationRequiredException(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication required.',
  });
}
