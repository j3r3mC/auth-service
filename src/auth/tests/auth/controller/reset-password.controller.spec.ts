import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';
import { ResetPasswordDto } from '../../../dto/reset-password.dto';

describe('AuthController - resetPassword', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.resetPassword with correct DTO', async () => {
    service.resetPassword.mockResolvedValue({
      message: 'Password reset successful',
    });

    const dto: ResetPasswordDto = {
      token: 'reset-token-123',
      password: 'newPassword123',
    };

    const result = await controller.resetPassword(dto);

    expect(service.resetPassword).toHaveBeenCalledWith(dto);

    expect(result).toEqual({
      message: 'Password reset successful',
    });
  });
});
