const OPENAPI_RATE_LIMIT_KEY = Buffer.alloc(32, 0xa4).toString('base64');
const OPENAPI_CSRF_KEY = Buffer.alloc(32, 0xc5).toString('base64');

export function prepareOpenApiGenerationEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  environment.AUTH_RATE_LIMIT_HMAC_KEY_BASE64 ||= OPENAPI_RATE_LIMIT_KEY;
  environment.AUTH_CSRF_SECRET_BASE64 ||= OPENAPI_CSRF_KEY;
}
