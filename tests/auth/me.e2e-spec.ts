import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { execSync } from 'node:child_process';

describe('Auth - Me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    email: 'me@test.com',
    password: 'password123',
  };

  let accessToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return current user info', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', user.email);

    // Sensitive fields must NOT be present
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  it('should fail without token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('should fail with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });
});
