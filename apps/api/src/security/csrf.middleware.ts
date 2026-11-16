import type { RequestHandler } from 'express';
import type { AuthCsrfService } from './auth-csrf.service.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createCsrfMiddleware(
  csrf: AuthCsrfService,
  onRejected: () => void = () => undefined,
): RequestHandler {
  return (request, response, next) => {
    if (!request.path.startsWith('/api/v1/') || SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    if (!csrf.validate(request)) {
      onRejected();
      response.status(403).json({
        code: 'CSRF_INVALID',
        message: 'Invalid request.',
      });

      return;
    }

    next();
  };
}
