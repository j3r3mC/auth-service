// src/auth/tests/auth/service/forgot-password.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../auth.service';
import { AuthRepository } from '../../../auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('AuthService - forgotPassword', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  const mockUser = {
    id: '123',
    email: 'test@mail.com',
    password: 'hashed',
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
            setResetToken: jest.fn(),
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

    jest.clearAllMocks();
  });

  // -------------------------
  // 1) Email inconnu
  // -------------------------
  it('should return undefined if user does not exist', async () => {
    repo.findByEmail.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'unknown@mail.com' });

    expect(result).toBeUndefined();
    expect(repo.setResetToken).not.toHaveBeenCalled();
  });

  // -------------------------
  // 2) Génère un token
  // -------------------------
  it('should generate a token when user exists', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (randomBytes as jest.Mock).mockReturnValue(Buffer.from('abc123'));
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedToken');

    const result = await service.forgotPassword({ email: 'test@mail.com' });

    expect(result).toBe(Buffer.from('abc123').toString('hex'));
  });

  // -------------------------
  // 3) Appelle setResetToken correctement
  // -------------------------
  it('should store hashed token and expiration', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);

    (randomBytes as jest.Mock).mockReturnValue(Buffer.from('abc123'));
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedToken');

    const before = Date.now();

    await service.forgotPassword({ email: 'test@mail.com' });

    const after = Date.now();

    expect(repo.setResetToken).toHaveBeenCalledTimes(1);

    const [userId, tokenHash, expiresAt] = repo.setResetToken.mock.calls[0];

    expect(userId).toBe('123');
    expect(tokenHash).toBe('hashedToken');

    // Vérifie que expiresAt est dans les 15 minutes
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 16 * 60 * 1000);
  });
});
