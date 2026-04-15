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

  // 🔥 On tape explicitement les mocks du repo
  let mockedRepo: {
    create: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            // 🔥 Fonctions fléchées → plus de this → plus d’unbound-method
            create: vi.fn(() => {}),
            findByEmail: vi.fn(() => {}),
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
      create: repo.create as ReturnType<typeof vi.fn>,
      findByEmail: repo.findByEmail as ReturnType<typeof vi.fn>,
    };

    // bcrypt.hash mocké proprement
    (bcrypt.hash as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'hashed_password',
    );

    // repo.create mocké proprement
    mockedRepo.create.mockResolvedValue({ id: 'user-id' });

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
    expect(mockedRepo.create).toHaveBeenCalledWith({
      email: 'test@mail.com',
      password: 'hashed_password',
    });
    expect(service.getTokens).toHaveBeenCalledWith('user-id');

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
      expect(service.getTokens).toHaveBeenCalledWith('user-id');

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
