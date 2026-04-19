import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  // REGISTER
  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ForbiddenException('Email already taken');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.repo.createUser({
      ...dto,
      password: hash,
    });

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'User registered successfully',
      ...tokens,
    };
  }

  // LOGIN
  async login(dto: LoginDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) throw new ForbiddenException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new ForbiddenException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Login successful',
      ...tokens,
    };
  }

  // GENERATE TOKENS
  async getTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  // STORE REFRESH TOKEN HASH
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.repo.updateRefreshToken(userId, hash);
  }

  // REFRESH TOKENS
  async refresh(dto: RefreshDto) {
    interface JwtPayload {
      sub: string;
      email: string;
    }

    const payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET!,
    });

    const user = await this.repo.findById(payload.sub);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access denied');

    const tokenMatches = await bcrypt.compare(
      dto.refreshToken,
      user.refreshToken,
    );

    if (!tokenMatches) throw new ForbiddenException('Access denied');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Tokens refreshed',
      ...tokens,
    };
  }

  // LOGOUT
  async logout(userId: string) {
    await this.repo.clearRefreshToken(userId);
    return { message: 'Logged out' };
  }
}
