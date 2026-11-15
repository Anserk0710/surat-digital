import type { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createTrustedOriginMiddleware(configuredOrigin: string): RequestHandler {
  const trustedOrigin = new URL(configuredOrigin).origin;

  return (request, response, next) => {
    // Phase P03: seluruh mutation menggunakan /api/v1/auth.
    if (!request.path.startsWith('/api/v1/auth/')) {
      next();
      return;
    }

    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    const requestOrigin = request.headers.origin;

    if (requestOrigin !== trustedOrigin) {
      response.status(403).json({
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed.',
      });
      return;
    }

    next();
  };
}
