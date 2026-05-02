// src/auth/tests/auth/service/update-user.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../auth.service';
import { AuthRepository } from '../../../auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AuthService - updateUser', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  const mockUser = {
    id: '123',
    email: 'old@mail.com',
    password: 'hashed',
    refreshToken: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            updateUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(AuthRepository);
  });

  // -------------------------
  // 1) Cas nominal
  // -------------------------
  it('should update user successfully', async () => {
    const dto = { email: 'new@mail.com', password: 'newpass' };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPass');

    repo.updateUser.mockResolvedValue({
      ...mockUser,
      email: 'new@mail.com',
    });

    const result = await service.updateUser('123', dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);

    expect(repo.updateUser).toHaveBeenCalledWith('123', {
      email: 'new@mail.com',
      password: 'hashedNewPass',
    });

    expect(result).toEqual({
      message: 'User updated successfully',
      user: {
        id: '123',
        email: 'new@mail.com',
      },
    });
  });

  // -------------------------
  // 2) Email uniquement
  // -------------------------
  it('should update only email when password is not provided', async () => {
    const dto = { email: 'updated@mail.com' };

    repo.updateUser.mockResolvedValue({
      ...mockUser,
      email: 'updated@mail.com',
    });

    const result = await service.updateUser('123', dto);

    expect(bcrypt.hash).not.toHaveBeenCalled();

    expect(repo.updateUser).toHaveBeenCalledWith('123', {
      email: 'updated@mail.com',
    });

    expect(result.user.email).toBe('updated@mail.com');
  });

  // -------------------------
  // 3) Password uniquement
  // -------------------------
  it('should update only password when email is not provided', async () => {
    const dto = { password: 'newpass' };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');

    repo.updateUser.mockResolvedValue({
      ...mockUser,
    });

    const result = await service.updateUser('123', dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);

    expect(repo.updateUser).toHaveBeenCalledWith('123', {
      password: 'hashedPass',
    });

    expect(result.user.id).toBe('123');
  });

  // -------------------------
  // 4) Erreur repo
  // -------------------------
  it('should throw if updateUser fails', async () => {
    const dto = { email: 'fail@mail.com' };

    repo.updateUser.mockRejectedValue(new Error('DB error'));

    await expect(service.updateUser('123', dto)).rejects.toThrow('DB error');
  });
});
