import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';
import { Request } from 'express';

type MockRequest = {
  user: { sub: string };
};

describe('AuthController - logout', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.logout with correct userId', async () => {
    service.logout.mockResolvedValue({ message: 'Logged out' });

    const req: MockRequest = { user: { sub: '123' } };
    const castReq = req as unknown as Request;

    const result = await controller.logout(castReq);

    expect(service.logout).toHaveBeenCalledWith('123');
    expect(result).toEqual({ message: 'Logged out' });
  });
});
