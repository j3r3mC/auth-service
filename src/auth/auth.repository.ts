import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createUser = (dto: RegisterDto) => {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: dto.password,
      },
    });
  };

  findById = (id: string) => {
    return this.prisma.user.findUnique({
      where: { id },
    });
  };

  findByEmail = (email: string) => {
    return this.prisma.user.findUnique({
      where: { email },
    });
  };

  updateRefreshToken = (userId: string, refreshTokenHash: string | null) => {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });
  };

  clearRefreshToken = (userId: string) => {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  };

  async updateUser(
    id: string,
    data: Partial<{ email: string; password: string }>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
