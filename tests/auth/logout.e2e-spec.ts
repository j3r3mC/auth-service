import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { execSync } from 'node:child_process';

describe('Auth - Logout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    email: 'logout@test.com',
    password: 'password123',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Reset DB
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

    // Start full app
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Register user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);

    // Login user
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user)
      .expect(200);

    accessToken = loginRes.body.accessToken;
    refreshToken = loginRes.body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should logout successfully and clear refresh token', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser.refreshToken).toBeNull();
  });

  it('should not allow refresh after logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
