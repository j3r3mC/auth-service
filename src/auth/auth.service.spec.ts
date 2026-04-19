jest.mock('bcrypt', () => ({
  hash: jest.fn((data: string) => Promise.resolve('hashed_' + data)),
}));

import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { AuthRepository } from '../auth/auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService - register', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
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

    service = moduleRef.get(AuthService);
    repo = moduleRef.get(AuthRepository);
  });

  it('should hash password before saving user', async () => {
    // Mock bcrypt.hash pour TOUS les appels

    // Mock createUser avec un User complet
    jest.spyOn(repo, 'createUser').mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_123456',
      refreshToken: null,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof repo.createUser>>);

    await service.register({
      email: 'test@mail.com',
      password: '123456',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);

    expect(repo.createUser).toHaveBeenCalledWith({
      email: 'test@mail.com',
      password: 'hashed_123456',
    });
  });
});
