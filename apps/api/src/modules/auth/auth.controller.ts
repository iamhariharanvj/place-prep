import { Controller, Post, Body, Res, Req, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { registerSchema, loginSchema } from '@placement/shared';
import { Public } from '../../common/decorators/roles.decorator';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'refreshToken';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body(ZodBody(registerSchema)) dto: ReturnType<typeof registerSchema.parse>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshRaw);
    const { refreshRaw: _, ...body } = result;
    return body;
  }

  @Public()
  @Post('login')
  async login(
    @Body(ZodBody(loginSchema)) dto: ReturnType<typeof loginSchema.parse>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshRaw);
    const { refreshRaw: _, ...body } = result;
    return body;
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshRaw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { tokens, refreshRaw: newRefresh } = await this.auth.refreshWithRotation(refreshRaw);
    this.setRefreshCookie(res, newRefresh);
    return tokens;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 86400000,
      path: '/api/v1/auth',
    });
  }
}
