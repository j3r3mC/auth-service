import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../auth.controller';
import { AuthService } from '../../../auth.service';
import { Request } from 'express';

type MockRequest = {
  user: { sub: string };
};

describe('AuthController - updateUser', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

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
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should call AuthService.updateUser with correct userId and dto', async () => {
    service.updateUser.mockResolvedValue({
      message: 'User updated successfully',
      user: {
        id: '123',
        email: 'new@mail.com',
      },
    });

    const req: MockRequest = { user: { sub: '123' } };
    const castReq = req as unknown as Request;

    const dto = { email: 'new@mail.com' };

    const result = await controller.updateUser(castReq, dto);

    expect(service.updateUser).toHaveBeenCalledWith('123', dto);
    expect(result).toEqual({
      message: 'User updated successfully',
      user: {
        id: '123',
        email: 'new@mail.com',
      },
    });
  });
});
