import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ type: String, example: 'FINANCE_APPROVERS' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ type: String, example: 'Finance Approvers' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateGroupDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class SetGroupActiveDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  active!: boolean;
}

export class AddGroupMemberDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  employeeId!: string;
}

export class SetGroupPermissionDto {
  @ApiProperty({ type: String, example: 'Document.Download' })
  @IsString()
  @Matches(/^[A-Z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/)
  @MaxLength(150)
  permissionCode!: string;

  @ApiProperty({ type: String, enum: ['ALLOW', 'DENY'] })
  @IsIn(['ALLOW', 'DENY'])
  effect!: 'ALLOW' | 'DENY';
}

export class SetGroupPermissionsBatchDto {
  @ApiProperty({ type: [String], example: ['Document.Create', 'Document.ViewAll'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @Matches(/^[A-Z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/, { each: true })
  permissionCodes!: string[];

  @ApiProperty({ type: String, enum: ['ALLOW', 'DENY'] })
  @IsIn(['ALLOW', 'DENY'])
  effect!: 'ALLOW' | 'DENY';
}
