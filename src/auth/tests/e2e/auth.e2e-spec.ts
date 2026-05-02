console.log('>>> DATABASE_URL =', process.env.DATABASE_URL);
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');

import { AppModule } from '../../../app.module';

console.log('>>> DATABASE_URL =', process.env.DATABASE_URL);

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@mail.com',
        password: 'password123',
      })
      .expect(201);

    expect(res.body).toHaveProperty('message');
  });
});
