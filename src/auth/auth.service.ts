import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  register = async (dto: { email: string; password: string }) => {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.repo.create({ email: dto.email, password: hash });

    const tokens = await this.getTokens(user.id);

    return {
      message: 'User registered successfully',
      ...tokens,
    };
  };

  getTokens = async (userId: string) => {
    const payload = { id: userId };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('AT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('RT_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  };

  login = async (dto: { email: string; password: string }) => {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new Error('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id);

    return {
      message: 'Login successful',
      ...tokens,
    };
  };
}
