import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      try {
        return (await super.canActivate(context)) as boolean;
      } catch {
        return true;
      }
    }
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<T>(err: Error | null, user: T, _info: unknown, context: ExecutionContext): T {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return (user ?? null) as T;
    }
    if (err || !user) {
      throw err ?? new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized', details: {} } });
    }
    return user;
  }
}
