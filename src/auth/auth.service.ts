// cSpell: disable
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomBytes } from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  // -------------------------
  // Helpers
  // -------------------------

  private async hash(data: string) {
    return bcrypt.hash(data, 10);
  }

  private async compare(data: string, hash: string) {
    return bcrypt.compare(data, hash);
  }

  private async generateTokens(userId: string, email: string) {
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

  private async storeRefreshToken(userId: string, token: string | null) {
    const hash = token ? await this.hash(token) : null;
    await this.repo.updateRefreshToken(userId, hash);
  }

  // -------------------------
  // REGISTER
  // -------------------------

  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ForbiddenException('Email already taken');

    const hashedPassword = await this.hash(dto.password);

    const user = await this.repo.createUser({
      ...dto,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'User registered successfully',
      ...tokens,
    };
  }

  // -------------------------
  // LOGIN
  // -------------------------

  async login(dto: LoginDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) throw new ForbiddenException('Invalid credentials');

    const valid = await this.compare(dto.password, user.password);
    if (!valid) throw new ForbiddenException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Login successful',
      ...tokens,
    };
  }

  // -------------------------
  // REFRESH TOKENS
  // -------------------------

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; email: string };

    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.repo.findById(payload.sub);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access denied');

    const matches = await this.compare(dto.refreshToken, user.refreshToken);
    if (!matches) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Tokens refreshed',
      ...tokens,
    };
  }

  // -------------------------
  // LOGOUT
  // -------------------------

  async logout(userId: string) {
    await this.storeRefreshToken(userId, null);
    return { message: 'Logged out' };
  }

  // -------------------------
  // UPDATE USER
  // -------------------------

  async updateUser(userId: string, dto: UpdateUserDto) {
    const data: Partial<{ email: string; password: string }> = {};

    if (dto.email) data.email = dto.email;
    if (typeof dto.password === 'string' && dto.password.trim() !== '') {
      data.password = await this.hash(dto.password);
    }

    const updated = await this.repo.updateUser(userId, data);

    return {
      message: 'User updated successfully',
      user: {
        id: updated.id,
        email: updated.email,
      },
    };
  }

  // -------------------------
  // FORGOT PASSWORD
  // -------------------------

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const tokenHash = await this.hash(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repo.setResetToken(user.id, tokenHash, expiresAt);

    return token;
  }

  // -------------------------
  // RESET PASSWORD
  // -------------------------

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = await this.hash(dto.token);

    const user = await this.repo.findByResetToken(tokenHash);
    if (!user) throw new NotFoundException('User not found');

    // Vérifier expiration
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired token');
    }

    // Vérifier correspondance du token
    const valid = await this.compare(dto.token, user.resetToken!);
    if (!valid) throw new ForbiddenException('Invalid or expired token');

    const hashedPassword = await this.hash(dto.password);

    await this.repo.updatePassword(user.id, hashedPassword);
    await this.repo.clearResetToken(user.id);

    return { message: 'Password updated' };
  }
}
