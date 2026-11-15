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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthService } from './auth.service.js';
import { LoginRequestDto } from './dto/login-request.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,

    @Inject(AuthCookieService)
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  async me(
    @Req()
    request: Request,
  ) {
    return this.authService.me(this.cookies.read(request));
  }
}
