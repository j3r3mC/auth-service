import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// Mock bcrypt AVANT l'import
vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService (Vitest)', () => {
  let service: AuthService;

  // 🔥 Mocks alignés EXACTEMENT avec AuthRepository
  let mockedRepo: {
    createUser: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    updateRefreshToken: ReturnType<typeof vi.fn>;
    clearRefreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            createUser: vi.fn(),
            findByEmail: vi.fn(),
            updateRefreshToken: vi.fn(),
            clearRefreshToken: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);

    const repo = module.get(AuthRepository);

    // 🔥 On récupère les mocks proprement typés
    mockedRepo = {
      createUser: repo.createUser as ReturnType<typeof vi.fn>,
      findByEmail: repo.findByEmail as ReturnType<typeof vi.fn>,
      updateRefreshToken: repo.updateRefreshToken as ReturnType<typeof vi.fn>,
      clearRefreshToken: repo.clearRefreshToken as ReturnType<typeof vi.fn>,
    };

    // bcrypt.hash mocké proprement
    (bcrypt.hash as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'hashed_password',
    );

    // repo.createUser mocké proprement
    mockedRepo.createUser.mockResolvedValue({ id: 'user-id' });

    // getTokens mocké proprement
    vi.spyOn(service, 'getTokens').mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password and create user', async () => {
    const dto = { email: 'test@mail.com', password: '123456' };

    const result = await service.register(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(mockedRepo.createUser).toHaveBeenCalledWith({
      email: 'test@mail.com',
      password: 'hashed_password',
    });

    // 🔥 AuthService appelle getTokens(userId, undefined)
    expect(service.getTokens).toHaveBeenCalledWith('user-id', undefined);

    expect(result).toEqual({
      message: 'User registered successfully',
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const dto = { email: 'test@mail.com', password: '123456' };

      // Mock: l'utilisateur existe
      mockedRepo.findByEmail.mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        password: 'hashed_password',
      });

      // Mock: le mot de passe est correct
      (bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );

      const result = await service.login(dto);

      expect(mockedRepo.findByEmail).toHaveBeenCalledWith('test@mail.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed_password');

      // 🔥 AuthService appelle getTokens(userId, email)
      expect(service.getTokens).toHaveBeenCalledWith('user-id', 'test@mail.com');

      expect(result).toEqual({
        message: 'Login successful',
        accessToken: 'access',
        refreshToken: 'refresh',
      });
    });

    it('should throw if user does not exist', async () => {
      mockedRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@mail.com', password: '123456' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw if password is incorrect', async () => {
      mockedRepo.findByEmail.mockResolvedValue({
        id: 'user-id',
        email: 'test@mail.com',
        password: 'hashed_password',
      });

      (bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );

      await expect(
        service.login({ email: 'test@mail.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
