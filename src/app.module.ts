import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [process.cwd() + '/.env.testing', process.cwd() + '/.env'],
    }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
