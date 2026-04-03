import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  /* eslint-disable @typescript-eslint/no-unsafe-call */

  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
