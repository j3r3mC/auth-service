import { IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  /* eslint-disable @typescript-eslint/no-unsafe-call */

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
