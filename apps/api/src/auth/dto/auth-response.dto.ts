import { ApiProperty } from '@nestjs/swagger';

export class AuthCompanyDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class AuthUserDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  employeeNumber!: string;

  @ApiProperty({ type: String })
  username!: string;

  @ApiProperty({ type: String, format: 'email' })
  email!: string;

  @ApiProperty({ type: String })
  fullName!: string;

  @ApiProperty({ type: String, enum: ['ACTIVE'] })
  status!: string;

  @ApiProperty({ type: () => AuthCompanyDto })
  company!: AuthCompanyDto;
}

export class AuthLoginResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  authenticated!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  sessionExpiresAt!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}

export class AuthRefreshResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  refreshed!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  sessionExpiresAt!: string;
}

export class AuthMeResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  authenticated!: boolean;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}
