/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
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
  async register(dto: { email: string; password: string }) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.repo.create({ email: dto.email, password: hash });

    const tokens = await this.getTokens(user.id);

    return {
      message: 'User registered successfully',
      ...tokens,
    };
  }

  async getTokens(userId: string) {
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
  }
}
