import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';

describe('AuthController - login', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.login with correct payload', async () => {
    service.login.mockResolvedValue({
      message: 'Login successful',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const dto = {
      email: 'test@mail.com',
      password: '123456',
    };

    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);

    expect(result).toEqual({
      message: 'Login successful',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
