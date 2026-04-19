import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { execSync } from 'node:child_process';

describe('Auth - Refresh (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    email: 'refresh@test.com',
    password: 'password123',
  };

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

    // Login user to get refresh token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user)
      .expect(200);

    refreshToken = loginRes.body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should refresh tokens successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser.refreshToken).not.toBeNull();

    // The stored hash must NOT equal the raw token
    expect(dbUser.refreshToken).not.toBe(refreshToken);

    // The new refresh token must NOT equal the old one
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('should fail with invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' })
      .expect(401);
  });

  it('should fail if refresh token does not match stored hash', async () => {
    // Corrupt the stored hash
    await prisma.user.update({
      where: { email: user.email },
      data: { refreshToken: 'fakehash' },
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
