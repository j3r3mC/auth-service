import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { execSync } from 'node:child_process';

describe('Auth - Register (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(201);

    // Response checks
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // DB checks
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    expect(user).not.toBeNull();
    expect(user.password).not.toBe(dto.password);
    expect(user.refreshToken).not.toBeNull();
  });
});
