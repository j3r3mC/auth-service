// src/auth/tests/auth/service/reset-password.spec.ts
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

describe('AuthService - resetPassword', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  const mockUser = {
    id: '123',
    email: 'test@mail.com',
    password: 'hashed',
    refreshToken: null,
    resetToken: 'hashedResetToken',
    resetTokenExpiresAt: new Date(Date.now() + 10000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findByResetToken: jest.fn(),
            updatePassword: jest.fn(),
            clearResetToken: jest.fn(),
          },
        },
        JwtService,
        ConfigService,
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(AuthRepository);
  });

  it('should reset password successfully', async () => {
    repo.findByResetToken.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

    repo.updatePassword.mockResolvedValue(mockUser);
    repo.clearResetToken.mockResolvedValue(mockUser);

    const result = await service.resetPassword({
      token: 'rawToken',
      password: 'newPassword',
    });

    expect(repo.findByResetToken).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'rawToken',
      mockUser.resetToken,
    );
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(repo.updatePassword).toHaveBeenCalledWith(
      '123',
      'newHashedPassword',
    );
    expect(repo.clearResetToken).toHaveBeenCalledWith('123');

    expect(result).toEqual({ message: 'Password updated' });
  });

  // token invalid
  it('should throw if reset token is invalid', async () => {
    repo.findByResetToken.mockResolvedValue(mockUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.resetPassword({
        token: 'wrongToken',
        password: 'newPassword',
      }),
    ).rejects.toThrow('Invalid or expired token');
  });

  // token expired
  it('should throw if reset token is expired', async () => {
    const expiredUser = {
      ...mockUser,
      resetTokenExpiresAt: new Date(Date.now() - 10000), // expiré
    };

    repo.findByResetToken.mockResolvedValue(expiredUser);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.resetPassword({
        token: 'validToken',
        password: 'newPassword',
      }),
    ).rejects.toThrow('Invalid or expired token');
  });

  // user not found
  it('should throw if user is not found', async () => {
    repo.findByResetToken.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: 'whatever',
        password: 'newPassword',
      }),
    ).rejects.toThrow('User not found');
  });
});
