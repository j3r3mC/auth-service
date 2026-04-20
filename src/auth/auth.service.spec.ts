/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('bcrypt', () => ({
  hash: jest.fn((data: string) => Promise.resolve('hashed_' + data)),
  compare: jest.fn(() => Promise.resolve(true)),
}));

import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { AuthRepository } from '../auth/auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
            verifyAsync: jest.fn(), // 👉 AJOUT OBLIGATOIRE
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

  /// Tests for register method

  it('should hash password before saving user', async () => {
    repo.createUser.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_123456',
      refreshToken: null,
      createdAt: new Date(),
    });

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

  it('should throw if createUser fails', async () => {
    repo.findByEmail.mockResolvedValue(null);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

    repo.createUser.mockRejectedValue(new Error('DB error'));

    await expect(
      service.register({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow('DB error');

    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if email is already taken', async () => {
    repo.findByEmail.mockResolvedValue({
      id: 'existing-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    await expect(
      service.register({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow();

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if bcrypt.hash fails', async () => {
    repo.findByEmail.mockResolvedValue(null);

    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

    await expect(
      service.register({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow('Hash error');

    expect(repo.createUser).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if updateRefreshToken fails', async () => {
    repo.findByEmail.mockResolvedValue(null);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

    repo.createUser.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    (service['jwt'].signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    (repo.updateRefreshToken as jest.Mock).mockRejectedValue(
      new Error('Update error'),
    );

    await expect(
      service.register({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow('Update error');

    expect(repo.updateRefreshToken).toHaveBeenCalledWith(
      'user-id',
      expect.any(String),
    );
  });

  /// Tests for login method

  it('should login successfully with valid credentials', async () => {
    repo.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    (service['jwt'].signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    (repo.updateRefreshToken as jest.Mock).mockResolvedValue(undefined);

    const result = await service.login({
      email: 'test@mail.com',
      password: '123456',
    });

    expect(repo.findByEmail).toHaveBeenCalledWith('test@mail.com');
    expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed_password');

    expect(result).toEqual({
      message: 'Login successful',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('should throw if email does not exist', async () => {
    repo.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow('Invalid credentials');

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if password is incorrect', async () => {
    repo.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        email: 'test@mail.com',
        password: 'wrongpass',
      }),
    ).rejects.toThrow('Invalid credentials');

    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if updateRefreshToken fails', async () => {
    repo.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    (service['jwt'].signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    (repo.updateRefreshToken as jest.Mock).mockRejectedValue(
      new Error('Update error'),
    );

    await expect(
      service.login({
        email: 'test@mail.com',
        password: '123456',
      }),
    ).rejects.toThrow('Update error');

    expect(repo.updateRefreshToken).toHaveBeenCalledWith(
      'user-id',
      expect.any(String),
    );
  });

  /// test refresh method

  it('should refresh tokens successfully', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-id',
      email: 'test@mail.com',
    });

    repo.findById.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: 'hashed_refresh',
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    (service['jwt'].signAsync as jest.Mock)
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    (repo.updateRefreshToken as jest.Mock).mockResolvedValue(undefined);

    const result = await service.refresh({
      refreshToken: 'valid-refresh',
    });

    expect(service['jwt'].verifyAsync).toHaveBeenCalled();
    expect(repo.findById).toHaveBeenCalledWith('user-id');
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'valid-refresh',
      'hashed_refresh',
    );

    expect(result).toEqual({
      message: 'Tokens refreshed',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('should throw if verifyAsync fails', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockRejectedValue(
      new Error('Invalid token'),
    );

    await expect(
      service.refresh({ refreshToken: 'bad-token' }),
    ).rejects.toThrow('Access denied');

    expect(repo.findById).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if user does not exist', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-id',
      email: 'test@mail.com',
    });

    repo.findById.mockResolvedValue(null);

    await expect(service.refresh({ refreshToken: 'token' })).rejects.toThrow(
      'Access denied',
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if user has no refresh token stored', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-id',
      email: 'test@mail.com',
    });

    repo.findById.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: null,
      createdAt: new Date(),
    });

    await expect(service.refresh({ refreshToken: 'token' })).rejects.toThrow(
      'Access denied',
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
  });

  it('should throw if refresh token does not match', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-id',
      email: 'test@mail.com',
    });

    repo.findById.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: 'hashed_refresh',
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.refresh({ refreshToken: 'wrong-token' }),
    ).rejects.toThrow('Access denied');

    expect(service['jwt'].signAsync).not.toHaveBeenCalled();
    expect(repo.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw if updateRefreshToken fails', async () => {
    (service['jwt'].verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-id',
      email: 'test@mail.com',
    });

    repo.findById.mockResolvedValue({
      id: 'user-id',
      email: 'test@mail.com',
      password: 'hashed_password',
      refreshToken: 'hashed_refresh',
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    (service['jwt'].signAsync as jest.Mock)
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    (repo.updateRefreshToken as jest.Mock).mockRejectedValue(
      new Error('Update error'),
    );

    await expect(
      service.refresh({ refreshToken: 'valid-token' }),
    ).rejects.toThrow('Update error');
  });

  /// test for logout method

  it('should logout successfully', async () => {
    (repo.updateRefreshToken as jest.Mock).mockResolvedValue(undefined);

    const result = await service.logout('user-id');

    expect(repo.updateRefreshToken).toHaveBeenCalledWith('user-id', null);

    expect(result).toEqual({
      message: 'Logged out',
    });
  });

  it('should throw if updateRefreshToken fails during logout', async () => {
    (repo.updateRefreshToken as jest.Mock).mockRejectedValue(
      new Error('Update error'),
    );

    await expect(service.logout('user-id')).rejects.toThrow('Update error');

    expect(repo.updateRefreshToken).toHaveBeenCalledWith('user-id', null);
  });
});
