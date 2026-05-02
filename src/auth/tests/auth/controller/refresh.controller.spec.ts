// src/auth/tests/auth/controller/refresh.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';
import { RefreshDto } from '../../../dto/refresh.dto';

describe('AuthController - refresh', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.refresh with correct DTO', async () => {
    service.refresh.mockResolvedValue({
      message: 'Token refreshed',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const dto: RefreshDto = {
      refreshToken: 'token123',
    };

    const result = await controller.refresh(dto);

    expect(service.refresh).toHaveBeenCalledWith(dto);

    expect(result).toEqual({
      message: 'Token refreshed',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });
});
