// src/auth/tests/auth/service/register.spec.ts
// cSpell: disable
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));


import { Test } from '@nestjs/testing';
import { AuthService } from '../../../../auth/auth.service';
import { AuthRepository } from '../../../../auth/auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService - register', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwt: JwtService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repo = moduleRef.get(AuthRepository);
    jwt = moduleRef.get(JwtService);
  });

  it('should register a user successfully', async () => {
    // 1) email non existant
    repo.findByEmail.mockResolvedValue(null);

    // 2) hash du password
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed_pwd');

    // 3) création user
    repo.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      password: 'hashed_pwd',
      refreshToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
    });

    // 4) génération tokens
    jest
      .spyOn(jwt, 'signAsync')
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    // 5) stockage refresh token hashé
    repo.updateRefreshToken.mockResolvedValue(undefined);

    const result = await service.register({
      email: 'test@mail.com',
      password: '123456',
    });

    expect(repo.findByEmail).toHaveBeenCalledWith('test@mail.com');
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);

    expect(repo.createUser).toHaveBeenCalledWith({
      email: 'test@mail.com',
      password: 'hashed_pwd',
    });

    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    expect(repo.updateRefreshToken).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
    );

    expect(result).toEqual({
      message: 'User registered successfully',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('should throw if hashing the password fails', async () => {
  // 1. findByEmail → aucun utilisateur
  repo.findByEmail.mockResolvedValue(null);

  // 2. bcrypt.hash → échoue
  bcrypt.hash.mockRejectedValue(new Error('hash failed'));

  // 3. register() doit rejeter l’erreur
  await expect(
    service.register({ email: 'test@mail.com', password: '123456' }),
  ).rejects.toThrow('hash failed');

  // 4. Rien d’autre ne doit être appelé
  expect(repo.createUser).not.toHaveBeenCalled();
  expect(jwt.signAsync).not.toHaveBeenCalled();
  expect(repo.updateRefreshToken).not.toHaveBeenCalled();
});

it('should throw if createUser fails', async () => {
  // 1. findByEmail → aucun utilisateur
  repo.findByEmail.mockResolvedValue(null);

  // 2. bcrypt.hash → fonctionne
  bcrypt.hash.mockResolvedValue('hashed-password');

  // 3. createUser → échoue
  repo.createUser.mockRejectedValue(new Error('create failed'));

  // 4. register() doit rejeter l’erreur
  await expect(
    service.register({ email: 'test@mail.com', password: '123456' }),
  ).rejects.toThrow('create failed');

  // 5. Rien d’autre ne doit être appelé
  expect(jwt.signAsync).not.toHaveBeenCalled();
  expect(repo.updateRefreshToken).not.toHaveBeenCalled();
});

it('should throw if generateTokens fails', async () => {
  // 1. findByEmail → aucun utilisateur
  repo.findByEmail.mockResolvedValue(null);

  // 2. hash → fonctionne
  bcrypt.hash.mockResolvedValue('hashed-password');

  // 3. createUser → fonctionne
  repo.createUser.mockResolvedValue({ id: '123', email: 'test@mail.com' });

  // 4. jwt.signAsync → échoue
  jwt.signAsync.mockRejectedValue(new Error('jwt failed'));

  // 5. register() doit rejeter l’erreur
  await expect(
    service.register({ email: 'test@mail.com', password: '123456' }),
  ).rejects.toThrow('jwt failed');

  // 6. Rien d’autre ne doit être appelé
  expect(repo.updateRefreshToken).not.toHaveBeenCalled();
});

it('should throw if storing the refresh token fails', async () => {
  // 1. findByEmail → aucun utilisateur
  repo.findByEmail.mockResolvedValue(null);

  // 2. hash → fonctionne
  bcrypt.hash.mockResolvedValue('hashed-password');

  // 3. createUser → fonctionne
  repo.createUser.mockResolvedValue({ id: '123', email: 'test@mail.com' });

  // 4. generateTokens → fonctionne
  jwt.signAsync.mockResolvedValueOnce('access-token');
  jwt.signAsync.mockResolvedValueOnce('refresh-token');

  // 5. updateRefreshToken → échoue
  repo.updateRefreshToken.mockRejectedValue(new Error('refresh failed'));

  // 6. register() doit rejeter l’erreur
  await expect(
    service.register({ email: 'test@mail.com', password: '123456' }),
  ).rejects.toThrow('refresh failed');
});


});
