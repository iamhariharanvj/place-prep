import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: 'id' | 'sub' | 'role' | undefined, ctx: ExecutionContext): JwtUser | string => {
    const user = ctx.switchToHttp().getRequest().user as JwtUser;
    if (!data) return user;
    if (data === 'sub') return user.id;
    return user[data];
  },
);
