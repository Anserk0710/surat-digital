import { ApiProperty } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class OrganizationMasterResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  companyId!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class OfficeResponseDto extends OrganizationMasterResponseDto {
  @ApiProperty({ type: String, example: 'Asia/Makassar' })
  timezone!: string;
}

export class DivisionResponseDto extends OrganizationMasterResponseDto {}

export class JobTitleResponseDto extends OrganizationMasterResponseDto {}

export class OfficeDivisionResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  officeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  divisionId!: string;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class EmployeeAssignmentResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  employeeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  officeDivisionId!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
  })
  jobTitleId!: string | null;

  @ApiProperty({ type: Boolean })
  isPrimary!: boolean;

  @ApiProperty({
    format: 'date-time',
    type: String,
    nullable: true,
  })
  validFrom!: string | null;

  @ApiProperty({
    format: 'date-time',
    type: String,
    nullable: true,
  })
  validUntil!: string | null;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
