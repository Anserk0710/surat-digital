import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthCsrfService } from '../security/auth-csrf.service.js';
import { AuthRateLimitGuard } from '../security/auth-rate-limit.guard.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthService } from './auth.service.js';
import { LoginRequestDto } from './dto/login-request.dto.js';
import { UseInterceptors } from '@nestjs/common';
import { AuthAuditInterceptor } from '../security/auth-audit.interceptor.js';
import {
  AuthCsrfResponseDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthRefreshResponseDto,
} from './dto/auth-response.dto.js';

@UseInterceptors(AuthAuditInterceptor)
@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,

    @Inject(AuthCookieService)
    private readonly cookies: AuthCookieService,

    @Inject(AuthCsrfService)
    private readonly csrf: AuthCsrfService,
  ) {}

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authCsrf' })
  @ApiOkResponse({ type: AuthCsrfResponseDto })
  @ApiResponse({
    status: 429,
    description: 'Request rate limited.',
  })
  csrfToken(
    @Res({ passthrough: true })
    response: Response,
  ) {
    return {
      csrfToken: this.csrf.issue(response),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authLogin' })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: AuthLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Token obtained from GET /api/v1/auth/csrf.',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token or untrusted Origin.',
  })
  @ApiResponse({
    status: 429,
    description: 'Authentication request rate limited.',
  })
  async login(
    @Body()
    input: LoginRequestDto,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result = await this.authService.login(input);

    this.cookies.write(response, result.cookieToken, result.cookieExpiresAt);

    return result.body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authRefresh' })
  @ApiOkResponse({ type: AuthRefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiResponse({
    status: 409,
    description: 'Session refresh in progress.',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Token obtained from GET /api/v1/auth/csrf.',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token or untrusted Origin.',
  })
  @ApiResponse({
    status: 429,
    description: 'Authentication request rate limited.',
  })
  async refresh(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result = await this.authService.refresh(this.cookies.read(request));

    this.cookies.write(response, result.cookieToken, result.cookieExpiresAt);

    return result.body;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'authLogout' })
  @ApiNoContentResponse()
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Token obtained from GET /api/v1/auth/csrf.',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token or untrusted Origin.',
  })
  @ApiResponse({
    status: 429,
    description: 'Authentication request rate limited.',
  })
  async logout(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ): Promise<void> {
    await this.authService.logout(this.cookies.read(request));

    this.cookies.clear(response);
  }

  @Get('me')
  @ApiOperation({ operationId: 'authMe' })
  @ApiOkResponse({ type: AuthMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiResponse({
    status: 429,
    description: 'Request rate limited.',
  })
  async me(
    @Req()
    request: Request,
  ) {
    return this.authService.me(this.cookies.read(request));
  }
}
