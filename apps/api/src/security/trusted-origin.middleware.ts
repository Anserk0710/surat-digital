import type { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createTrustedOriginMiddleware(
  configuredOrigin: string,
  onRejected: () => void = () => undefined,
): RequestHandler {
  const trustedOrigin = new URL(configuredOrigin).origin;

  return (request, response, next) => {
    if (!request.path.startsWith('/api/v1/') || SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    if (request.headers.origin !== trustedOrigin) {
      onRejected();
      response.status(403).json({
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed.',
      });

      return;
    }

    next();
  };
}
