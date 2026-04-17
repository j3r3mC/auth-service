import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { SuperTest, Test as SupertestTest } from 'supertest';
import { AuthModule } from './auth.module';
import { AuthRepository } from './auth.repository';
import bcrypt from 'bcrypt';

// Mock bcrypt APRÈS les imports
vi.mock('bcrypt', () => ({
  compare: vi.fn<(password: string, hash: string) => Promise<boolean>>(),
  hash: vi.fn<(data: string, rounds: number) => Promise<string>>(),
}));

// Mock du repository (pas de vraie DB)
const mockRepo = {
  create: vi.fn(),
  findByEmail: vi.fn(),
};

describe('AuthModule (Integration HTTP)', () => {
  let app: INestApplication;
  let http: SuperTest<SupertestTest>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AuthRepository)
      .useValue(mockRepo)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // On tape Supertest ici (la seule manière correcte)
    http = request(app.getHttpServer()) as unknown as SuperTest<SupertestTest>;

    mockRepo.create.mockReset();
    mockRepo.findByEmail.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------------------------
  // REGISTER
  // ---------------------------
  it('POST /auth/register → should register user', async () => {
    mockRepo.create.mockResolvedValue({ id: 'user-id' });

    const res = await http
      .post('/auth/register')
      .send({ email: 'test@mail.com', password: '123456' })
      .expect(201);

    expect(mockRepo.create).toHaveBeenCalled();
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.message).toBe('User registered successfully');
  });

  // ---------------------------
  // LOGIN SUCCESS
  // ---------------------------
  it('POST /auth/login → should login successfully', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
    });

    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await http
      .post('/auth/login')
      .send({ email: 'test@mail.com', password: '123456' })
      .expect(201);

    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@mail.com');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.message).toBe('Login successful');
  });

  // ---------------------------
  // LOGIN FAIL (user not found)
  // ---------------------------
  it('POST /auth/login → should fail if user does not exist', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    const res = await http
      .post('/auth/login')
      .send({ email: 'unknown@mail.com', password: '123456' })
      .expect(500);

    expect(res.body.message).toContain('Invalid credentials');
  });

  // ---------------------------
  // LOGIN FAIL (wrong password)
  // ---------------------------
  it('POST /auth/login → should fail if password incorrect', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
    });

    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await http
      .post('/auth/login')
      .send({ email: 'test@mail.com', password: 'wrong' })
      .expect(500);

    expect(res.body.message).toContain('Invalid credentials');
  });
});
