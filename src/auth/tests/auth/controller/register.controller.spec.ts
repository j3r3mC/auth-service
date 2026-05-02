// src/auth/tests/auth/controller/register.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';

describe('AuthController - register', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.register with correct payload', async () => {
    service.register.mockResolvedValue({
      message: 'User registered successfully',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const dto = {
      email: 'test@mail.com',
      password: '123456',
    };

    const result = await controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);

    expect(result).toEqual({
      message: 'User registered successfully',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
