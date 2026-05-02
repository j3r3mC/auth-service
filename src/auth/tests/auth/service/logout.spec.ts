// src/auth/tests/auth/service/logout.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../auth.service';
import { AuthRepository } from '../../../auth.repository';

describe('AuthService - logout', () => {
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
            updateRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get(AuthRepository);

    jest.clearAllMocks();
  });

  it('should logout successfully', async () => {
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
