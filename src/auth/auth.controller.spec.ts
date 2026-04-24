import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';

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
        canActivate: jest.fn().mockReturnValue(true), // 👉 le Guard est mocké
      })
      .compile();

    controller = moduleRef.get(AuthController);
    service = moduleRef.get(AuthService);
  });

  it('should update user successfully', async () => {
    const req: any = {
      user: { sub: 'user-id', email: 'old@mail.com' },
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
    const req: any = {
      user: { sub: 'user-id' },
    };

    const dto = { email: 'new@mail.com' };

    service.updateUser.mockRejectedValue(new Error('Update error'));

    await expect(controller.updateUser(req, dto)).rejects.toThrow('Update error');
  });
});
