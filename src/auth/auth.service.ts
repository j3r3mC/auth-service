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
  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const hash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.repo.updateRefreshToken(userId, hash);
  }

  // REFRESH TOKENS
  async refresh(dto: RefreshDto) {
    interface JwtPayload {
      sub: string;
      email: string;
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new ForbiddenException('Access denied');
    }

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
    await this.updateRefreshToken(userId, null);
    return { message: 'Logged out' };
  }

  // UPDATE USER
  async updateUser(userId: string, dto: UpdateUserDto) {
    const data: Partial<{ email: string; password: string }> = {};

    if (dto.email) data.email = dto.email;

    if (dto.password) {
      const hash = await bcrypt.hash(dto.password, 10);
      data.password = hash;
    }

    const updatedUser = await this.repo.updateUser(userId, data);

    return {
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
      },
    };
  }

  // FORGOT PASSWORD
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) return; // on ne révèle rien

    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repo.setResetToken(user.id, tokenHash, expiresAt);

    return token; // à envoyer par email
  }

  // RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    // 1. On hash le token reçu pour comparer avec la base
    const tokenHash = await bcrypt.hash(token, 10);

    // 2. On cherche l'utilisateur avec ce hash
    const user = await this.repo.findByResetToken(tokenHash);
    if (!user) throw new UnauthorizedException('Invalid or expired token');

    // 3. Vérifier que le token correspond
    const isValid = await bcrypt.compare(token, user.resetToken!);
    if (!isValid) throw new UnauthorizedException('Invalid or expired token');

    // 4. Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Mettre à jour le mot de passe
    await this.repo.updatePassword(user.id, hashedPassword);

    // 6. Supprimer le reset token
    await this.repo.clearResetToken(user.id);

    return { message: 'Password updated' };
  }
}
