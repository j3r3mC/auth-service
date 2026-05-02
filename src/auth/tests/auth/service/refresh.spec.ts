// src/auth/tests/auth/service/refresh.spec.ts
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

describe('AuthService - refresh', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwt: jest.Mocked<JwtService>;
  let config: ConfigService;

  const mockUser = {
    id: '123',
    email: 'test@mail.com',
    password: 'hashed',
    refreshToken: 'oldRefreshToken',
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
            findById: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
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

    service = module.get(AuthService);
    repo = module.get(AuthRepository);
    jwt = module.get(JwtService);
    config = module.get(ConfigService);
  });

  it('should refresh tokens successfully', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: '123' });
    repo.findById.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwt.signAsync
      .mockResolvedValueOnce('newAccessToken')
      .mockResolvedValueOnce('newRefreshToken');

    repo.updateRefreshToken.mockResolvedValue(mockUser);

    const result = await service.refresh({ refreshToken: 'validToken' });

    expect(result).toEqual({
      accessToken: 'newAccessToken',
      refreshToken: 'newRefreshToken',
      message: 'Tokens refreshed',
    });
  });

  it('should throw if refresh token is invalid', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toThrow(
      'Access denied',
    );
  });
});
