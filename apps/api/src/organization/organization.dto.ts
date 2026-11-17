import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export class CreateMasterDto {
  @ApiProperty({ type: String, example: 'HRD' })
  @IsString()
  @Matches(CODE_PATTERN)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ type: String, example: 'Human Resource Development' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
}

export class UpdateMasterDto extends PartialType(CreateMasterDto) {
  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCompanyDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateOfficeDto extends CreateMasterDto {
  @ApiProperty({ type: String, example: 'Asia/Makassar' })
  @IsString()
  @MaxLength(100)
  timezone!: string;
}

export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {
  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateOfficeDivisionDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  officeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  divisionId!: string;
}

export class UpdateActiveDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  active!: boolean;
}

export class CreateAssignmentDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  officeDivisionId!: string;

  @ApiProperty({ type: String, format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  jobTitleId?: string | null;

  @ApiProperty({ type: Boolean, default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ type: String, example: '2026-11-16', required: false })
  @IsOptional()
  @IsDateString({ strict: true })
  validFrom?: string | null;

  @ApiProperty({ type: String, example: '2027-11-16', required: false })
  @IsOptional()
  @IsDateString({ strict: true })
  validUntil?: string | null;
}

export class UpdateAssignmentDto {
  @ApiProperty({ type: String, format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  jobTitleId?: string | null;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  validFrom?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  validUntil?: string | null;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
