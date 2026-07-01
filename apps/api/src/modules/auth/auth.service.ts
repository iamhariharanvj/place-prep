import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNull, gt } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RegisterDto, LoginDto, AuthTokensResponse, Role, JWT } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { aliases, refreshTokens, users } from '../../database/schema';
import { newId, sha256Hex } from '../../common/utils';

@Injectable()
export class AuthService {
  constructor(
    private db: DrizzleService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private toPublic(user: typeof users.$inferSelect) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      company: user.company ?? null,
      xp: user.xp,
      streakCount: user.streakCount,
    };
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse & { refreshRaw: string }> {
    const existing = await this.db.db.select().from(users).where(eq(users.email, dto.email)).limit(1);
    if (existing.length) {
      throw new ConflictException({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered', details: {} } });
    }

    const userId = newId();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.db.db.insert(users).values({
      id: userId,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      role: dto.role ?? Role.STUDENT,
      company: dto.role === Role.MENTOR ? (dto.company ?? null) : null,
    });

    let aliasName = dto.displayName;
    const aliasExists = await this.db.db.select().from(aliases).where(eq(aliases.displayName, aliasName)).limit(1);
    if (aliasExists.length) aliasName = `${dto.displayName}_${Math.floor(Math.random() * 9999)}`;

    await this.db.db.insert(aliases).values({
      id: newId(),
      userId,
      displayName: aliasName,
    });

    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse & { refreshRaw: string }> {
    const [user] = await this.db.db.select().from(users).where(eq(users.email, dto.email)).limit(1);
    if (!user) throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', details: {} } });

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', details: {} } });

    return this.issueTokens(user);
  }

  async refreshWithRotation(refreshRaw: string | undefined) {
    if (!refreshRaw) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Missing refresh token', details: {} } });
    }

    const tokenHash = sha256Hex(refreshRaw);
    const now = new Date();
    const [token] = await this.db.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, now)))
      .limit(1);

    if (!token) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token', details: {} } });
    }

    await this.db.db.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, token.id));

    const [user] = await this.db.db.select().from(users).where(eq(users.id, token.userId));
    if (!user) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'User not found', details: {} } });
    }

    const issued = await this.issueTokens(user);
    return {
      tokens: { accessToken: issued.accessToken, expiresIn: issued.expiresIn },
      refreshRaw: issued.refreshRaw,
    };
  }

  async logout(refreshRaw: string | undefined) {
    if (!refreshRaw) return;
    const tokenHash = sha256Hex(refreshRaw);
    await this.db.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash));
  }

  private async issueTokens(user: typeof users.$inferSelect): Promise<AuthTokensResponse & { refreshRaw: string }> {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRES') ?? JWT.ACCESS_TTL },
    );
    const refreshRaw = randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(refreshRaw);
    const days = this.config.get<number>('REFRESH_TOKEN_DAYS') ?? JWT.REFRESH_TTL_DAYS;
    const expiresAt = new Date(Date.now() + days * 86400000);

    await this.db.db.insert(refreshTokens).values({
      id: newId(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      expiresIn: 900,
      user: this.toPublic(user),
      refreshRaw,
    };
  }
}
