import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  create = (data: { email: string; password: string }) => {
    return this.prisma.user.create({ data });
  };

  findByEmail = (email: string) => {
    return this.prisma.user.findUnique({
      where: { email },
    });
  };
}
