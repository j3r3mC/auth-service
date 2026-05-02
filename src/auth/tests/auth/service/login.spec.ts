// src/auth/tests/auth/service/login.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../auth.service';
import { AuthRepository } from '../../../auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService - login', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwt: jest.Mocked<JwtService>;

  const mockUser = {
    id: '123',
    email: 'test@mail.com',
    password: 'hashed-password',
    refreshToken: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get(AuthRepository);
    jwt = module.get(JwtService);

    jest.clearAllMocks();
  });

  // -------------------------
  // TESTS
  // -------------------------

  it('should throw if email does not exist', async () => {
    repo.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'test@mail.com', password: '123456' }),
    ).rejects.toThrow('Invalid credentials');

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if password is invalid', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'test@mail.com', password: 'wrongpass' }),
    ).rejects.toThrow('Invalid credentials');

    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if generateTokens fails during login', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwt.signAsync.mockRejectedValue(new Error('jwt failed'));

    await expect(
      service.login({ email: 'test@mail.com', password: '123456' }),
    ).rejects.toThrow('jwt failed');

    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if storing refresh token fails during login', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwt.signAsync.mockResolvedValueOnce('access-token');
    jwt.signAsync.mockResolvedValueOnce('refresh-token');

    repo.updateRefreshToken.mockRejectedValue(new Error('refresh failed'));

    await expect(
      service.login({ email: 'test@mail.com', password: '123456' }),
    ).rejects.toThrow('refresh failed');
  });

  it('should login successfully and return valid tokens', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwt.signAsync.mockResolvedValueOnce('access-token');
    jwt.signAsync.mockResolvedValueOnce('refresh-token');

    repo.updateRefreshToken.mockResolvedValue(mockUser);

    const result = await service.login({
      email: 'test@mail.com',
      password: '123456',
    });

    expect(result).toEqual({
      message: 'Login successful',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
