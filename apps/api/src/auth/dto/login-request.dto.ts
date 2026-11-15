import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Email, Username, or NIP',
    type: String,
    maxLength: 320,
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(320)
  identifier!: string;

  @ApiProperty({
    type: String,
    writeOnly: true,
    minLength: 1,
    maxLength: 1024,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;
}
