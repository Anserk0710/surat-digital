import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  companyId!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class GroupMemberResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  employeeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: Boolean })
  active!: boolean;
}

export class GroupPermissionResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  permissionId!: string;

  @ApiProperty({ type: String, enum: ['ALLOW', 'DENY'] })
  effect!: 'ALLOW' | 'DENY';

  @ApiProperty({ type: Boolean })
  active!: boolean;
}

export class PermissionCatalogResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;
}

export class EffectivePermissionResponseDto {
  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String, enum: ['ALLOW', 'DENY'] })
  decision!: 'ALLOW' | 'DENY';
}
