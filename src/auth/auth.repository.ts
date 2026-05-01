// cSpell: disable

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------
  // USERS
  // -------------------------

  createUser(data: { email: string; password: string }) {
    return this.prisma.user.create({ data });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  updateUser(id: string, data: Partial<{ email: string; password: string }>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // -------------------------
  // REFRESH TOKEN
  // -------------------------

  updateRefreshToken(id: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: refreshTokenHash },
    });
  }

  clearRefreshToken(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: null },
    });
  }

  // -------------------------
  // RESET PASSWORD
  // -------------------------

  setResetToken(id: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });
  }

  findByResetToken(tokenHash: string) {
    return this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
  }

  clearResetToken(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  updatePassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
