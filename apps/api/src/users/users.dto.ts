import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ type: String }) @IsString() @MaxLength(50) companyCode!: string;
  @ApiProperty({ type: String }) @IsString() @MaxLength(100) employeeNumber!: string;
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/)
  @MaxLength(100)
  username!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(2) @MaxLength(200) fullName!: string;
  @ApiProperty({ type: String }) @IsEmail() @MaxLength(320) email!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class SetUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'SUSPENDED', 'INACTIVE'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

export class UpdateProfileDto {
  @ApiProperty({ type: String }) @IsString() @MinLength(2) @MaxLength(200) fullName!: string;
}

export class UserResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) employeeNumber!: string;
  @ApiProperty({ type: String }) username!: string;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'] }) status!: string;
}

export class ImportErrorDto {
  @ApiProperty({ type: Number }) row!: number;
  @ApiProperty({ type: String }) message!: string;
}
export class ImportResultDto {
  @ApiProperty({ type: Number }) created!: number;
  @ApiProperty({ type: [ImportErrorDto] }) errors!: ImportErrorDto[];
}
