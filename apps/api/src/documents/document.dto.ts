import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const DOCUMENT_STATUSES = [
  'DRAFT',
  'PENDING_ACKNOWLEDGMENT',
  'PENDING_APPROVAL',
  'IN_PROGRESS',
  'FINALIZING',
  'REJECTED',
  'CANCELLED',
  'ISSUED',
  'ARCHIVED',
] as const;

export type DocumentStatusValue = (typeof DOCUMENT_STATUSES)[number];

export class ListDocumentSubtypesQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  documentTypeId?: string;
}

export class CreateDocumentDraftDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  documentTypeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  documentSubtypeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  issuerOfficeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  issuerDivisionId!: string;

  @ApiProperty({
    type: String,
    maxLength: 300,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}

export class UpdateDocumentDraftDto extends PartialType(CreateDocumentDraftDto) {
  @ApiProperty({
    type: Number,
    minimum: 1,
    description: 'Revision terakhir yang dibaca browser untuk optimistic concurrency.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({
    type: String,
    enum: ['mine', 'accessible'],
    default: 'mine',
  })
  @IsOptional()
  @IsIn(['mine', 'accessible'])
  scope: 'mine' | 'accessible' = 'mine';

  @ApiPropertyOptional({
    type: String,
    enum: DOCUMENT_STATUSES,
  })
  @IsOptional()
  @IsIn(DOCUMENT_STATUSES)
  status?: DocumentStatusValue;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
