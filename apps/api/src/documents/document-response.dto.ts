import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DOCUMENT_STATUSES } from './document.dto.js';

export class DocumentTypeResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  description!: string | null;
}

export class DocumentSubtypeResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  documentTypeId!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  description!: string | null;
}

export class DocumentIssuerOfficeDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  timezone!: string;
}

export class DocumentIssuerDivisionDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class DocumentIssuerScopeResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  officeDivisionId!: string;

  @ApiProperty({ type: Boolean })
  isPrimary!: boolean;

  @ApiProperty({
    type: () => DocumentIssuerOfficeDto,
  })
  office!: DocumentIssuerOfficeDto;

  @ApiProperty({
    type: () => DocumentIssuerDivisionDto,
  })
  division!: DocumentIssuerDivisionDto;
}

export class DocumentCreatorResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: String })
  fullName!: string;

  @ApiProperty({ type: String })
  employeeNumber!: string;
}

export class DocumentResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'Document ID sekaligus Tracking ID.',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  companyId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  documentTypeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  documentSubtypeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  creatorEmployeeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  issuerOfficeId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  issuerDivisionId!: string;

  @ApiProperty({ type: String })
  title!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    type: String,
    enum: DOCUMENT_STATUSES,
  })
  status!: string;

  @ApiProperty({
    type: Number,
    minimum: 1,
  })
  revision!: number;

  @ApiProperty({
    type: () => DocumentTypeResponseDto,
  })
  documentType!: DocumentTypeResponseDto;

  @ApiProperty({
    type: () => DocumentSubtypeResponseDto,
  })
  documentSubtype!: DocumentSubtypeResponseDto;

  @ApiProperty({
    type: () => DocumentIssuerOfficeDto,
  })
  issuerOffice!: DocumentIssuerOfficeDto;

  @ApiProperty({
    type: () => DocumentIssuerDivisionDto,
  })
  issuerDivision!: DocumentIssuerDivisionDto;

  @ApiProperty({
    type: () => DocumentCreatorResponseDto,
  })
  creator!: DocumentCreatorResponseDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class DocumentListResponseDto {
  @ApiProperty({
    type: () => DocumentResponseDto,
    isArray: true,
  })
  items!: DocumentResponseDto[];

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
  })
  nextCursor!: string | null;
}

export class DocumentFileResponseDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) documentVersionId!: string;
  @ApiProperty({ enum: ['MAIN', 'ATTACHMENT'] }) fileRole!: string;
  @ApiProperty({ type: String }) originalFilename!: string;
  @ApiProperty({ type: String }) detectedMime!: string;
  @ApiProperty({ type: Number }) sizeBytes!: number;
  @ApiProperty({ type: String, description: 'Lowercase hexadecimal SHA-256.' }) sha256!: string;
  @ApiProperty({ enum: ['UPLOADED'] }) processingStatus!: string;
  @ApiProperty({ enum: ['PENDING'] }) reviewStatus!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
