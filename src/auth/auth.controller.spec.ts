import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';

type MockRequest = {
  user: { sub: string; email: string };
  get: (name: string) => string | undefined;
};

describe('AuthController - updateUser', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
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
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = moduleRef.get(AuthController);
    service = moduleRef.get(AuthService);
  });
  it('should update user successfully', async () => {
    const req: MockRequest = {
      user: { sub: 'user-id', email: 'old@mail.com' },
      get: () => undefined,
    };

    const dto = { email: 'new@mail.com' };

    service.updateUser.mockResolvedValue({
      message: 'User updated successfully',
      user: {
        id: 'user-id',
        email: 'new@mail.com',
      },
    });

    const result = await controller.updateUser(req, dto);

    expect(service.updateUser).toHaveBeenCalledWith('user-id', dto);

    expect(result).toEqual({
      message: 'User updated successfully',
      user: {
        id: 'user-id',
        email: 'new@mail.com',
      },
    });
  });
  it('should throw if service.updateUser throws', async () => {
    const req: MockRequest = {
      user: { sub: 'user-id', email: 'old@mail.com' },
      get: () => undefined,
    };

    const dto = { email: 'new@mail.com' };

    service.updateUser.mockRejectedValue(new Error('Update error'));

    await expect(controller.updateUser(req, dto)).rejects.toThrow(
      'Update error',
    );
  });
});
