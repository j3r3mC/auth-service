import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';
import { ForgotPasswordDto } from '../../../dto/forgot-password.dto';

describe('AuthController - forgotPassword', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            forgotPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.forgotPassword with correct DTO', async () => {
    service.forgotPassword.mockResolvedValue('Reset email sent');

    const dto: ForgotPasswordDto = { email: 'test@mail.com' };

    const result = await controller.forgotPassword(dto);

    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
    expect(result).toBe('Reset email sent');
  });
});
