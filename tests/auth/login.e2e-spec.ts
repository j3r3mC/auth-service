import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { execSync } from 'node:child_process';

describe('Auth - Login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    email: 'login@test.com',
    password: 'password123',
  };

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

    // Create user via register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should login successfully with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user)
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // Check DB refresh token is hashed
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser.refreshToken).not.toBeNull();
    expect(dbUser.refreshToken).not.toBe(res.body.refreshToken);
  });

  it('should fail with unknown email', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'unknown@test.com',
        password: 'password123',
      })
      .expect(401);
  });

  it('should fail with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'wrongpassword',
      })
      .expect(401);
  });
});
