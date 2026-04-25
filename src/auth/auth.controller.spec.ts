import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';
import type { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            updateUser: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should update user', async () => {
    const dto = { email: 'new@mail.com' };

    jest.spyOn(service, 'updateUser').mockResolvedValue({
      message: 'User updated successfully',
      user: { id: '123', email: 'new@mail.com' },
    });

    const req = {
      user: { sub: '123', email: 'old@mail.com' },
    } as unknown as Request;

    const result = await controller.updateUser(req, dto);

    expect(service.updateUser).toHaveBeenCalledWith('123', dto);
    expect(result).toEqual({
      message: 'User updated successfully',
      user: { id: '123', email: 'new@mail.com' },
    });
  });
});
