import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @MinLength(6)
  @MaxLength(36)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
