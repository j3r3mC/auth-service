// src/auth/tests/auth/service/login.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../auth.service';
import { AuthRepository } from '../../../auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// 🔥 Mock complet de bcrypt AVANT le describe
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService - login', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwt: jest.Mocked<JwtService>;
  let config: ConfigService;

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
    config = module.get(ConfigService);
  });

  it('should logout successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@mail.com',
      password: 'hashed',
      refreshToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
    };

    repo.updateRefreshToken.mockResolvedValue(mockUser);

    const result = await service.logout('123');

    expect(repo.updateRefreshToken).toHaveBeenCalledWith('123', null);
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('should throw if updateRefreshToken fails during logout', async () => {
    repo.updateRefreshToken.mockRejectedValue(new Error('DB error'));

    await expect(service.logout('123')).rejects.toThrow('DB error');
  });
});
