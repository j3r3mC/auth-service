// cSpell: disable

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------
  // USERS
  // -------------------------

  createUser(data: { email: string; password: string }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  updateUser(
    id: string,
    data: Partial<{ email: string; password: string }>,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // -------------------------
  // REFRESH TOKEN
  // -------------------------

  updateRefreshToken(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: refreshTokenHash },
    });
  }

  clearRefreshToken(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: null },
    });
  }

  // -------------------------
  // RESET PASSWORD
  // -------------------------

  setResetToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });
  }

  findByResetToken(tokenHash: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
  }

  clearResetToken(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
