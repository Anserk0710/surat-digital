import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentOrganizationActor } from '../organization/current-organization-actor.decorator.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import { RequireAuthenticatedPolicy, RequirePolicyAny } from '../policy/policy.decorators.js';
import { PolicyGuard } from '../policy/policy.guard.js';
import {
  CreateDocumentDraftDto,
  ListDocumentsQueryDto,
  ListDocumentSubtypesQueryDto,
  UpdateDocumentDraftDto,
} from './document.dto.js';
import {
  DocumentIssuerScopeResponseDto,
  DocumentResponseDto,
  DocumentListResponseDto,
  DocumentSubtypeResponseDto,
  DocumentTypeResponseDto,
  DocumentFileResponseDto,
} from './document-response.dto.js';
import { DocumentService } from './document.service.js';
import { MAX_DOCUMENT_FILE_BYTES } from './file-validation.js';

@ApiTags('Documents')
@Controller()
@UseGuards(PolicyGuard)
export class DocumentController {
  constructor(
    @Inject(DocumentService)
    private readonly documents: DocumentService,
  ) {}

  @Get('document-types')
  @RequireAuthenticatedPolicy()
  @ApiOperation({
    operationId: 'listDocumentTypes',
    summary: 'List active document types',
  })
  @ApiOkResponse({
    type: DocumentTypeResponseDto,
    isArray: true,
  })
  listTypes() {
    return this.documents.listDocumentTypes();
  }

  @Get('document-subtypes')
  @RequireAuthenticatedPolicy()
  @ApiOperation({
    operationId: 'listDocumentSubtypes',
    summary: 'List active document subtypes',
  })
  @ApiOkResponse({
    type: DocumentSubtypeResponseDto,
    isArray: true,
  })
  listSubtypes(
    @Query()
    query: ListDocumentSubtypesQueryDto,
  ) {
    return this.documents.listDocumentSubtypes(query.documentTypeId);
  }

  @Get('documents/issuer-scopes')
  @RequirePolicyAny('Document.Create')
  @ApiOperation({
    operationId: 'listDocumentIssuerScopes',
    summary: 'List active office/division scopes available to current creator',
  })
  @ApiOkResponse({
    type: DocumentIssuerScopeResponseDto,
    isArray: true,
  })
  listIssuerScopes(
    @CurrentOrganizationActor()
    actor: PolicyActor,
  ) {
    return this.documents.listIssuerScopes(actor);
  }

  @Post('documents')
  @RequirePolicyAny('Document.Create')
  @ApiOperation({
    operationId: 'createDocumentDraft',
    summary: 'Create document draft',
  })
  @ApiCreatedResponse({
    type: DocumentResponseDto,
  })
  @ApiBody({ type: CreateDocumentDraftDto })
  create(
    @CurrentOrganizationActor()
    actor: PolicyActor,

    @Body()
    input: CreateDocumentDraftDto,
  ) {
    return this.documents.createDraft(actor, input);
  }

  @Get('documents')
  @RequireAuthenticatedPolicy()
  @ApiOperation({
    operationId: 'listDocuments',
    summary: 'List documents visible to current employee',
  })
  @ApiOkResponse({
    type: DocumentListResponseDto,
  })
  list(
    @CurrentOrganizationActor()
    actor: PolicyActor,

    @Query()
    query: ListDocumentsQueryDto,
  ) {
    return this.documents.listDocuments(actor, query);
  }

  @Get('documents/:documentId')
  @RequireAuthenticatedPolicy()
  @ApiOperation({
    operationId: 'getDocument',
    summary: 'Read visible document',
  })
  @ApiOkResponse({
    type: DocumentResponseDto,
  })
  get(
    @CurrentOrganizationActor()
    actor: PolicyActor,

    @Param(
      'documentId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    documentId: string,
  ) {
    return this.documents.getDocument(actor, documentId);
  }

  @Patch('documents/:documentId')
  @RequirePolicyAny('Document.Create')
  @ApiOperation({
    operationId: 'updateDocumentDraft',
    summary: 'Update own document while it is still Draft',
  })
  @ApiOkResponse({
    type: DocumentResponseDto,
  })
  @ApiBody({ type: UpdateDocumentDraftDto })
  update(
    @CurrentOrganizationActor()
    actor: PolicyActor,

    @Param(
      'documentId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    documentId: string,

    @Body()
    input: UpdateDocumentDraftDto,
  ) {
    return this.documents.updateDraft(actor, documentId, input);
  }

  @Get('documents/:documentId/files')
  @RequireAuthenticatedPolicy()
  @ApiOperation({ operationId: 'listDocumentFiles' })
  @ApiOkResponse({ type: DocumentFileResponseDto, isArray: true })
  listFiles(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
  ) {
    return this.documents.listFiles(actor, documentId);
  }

  @Post('documents/:documentId/files/upload')
  @RequirePolicyAny('Document.Create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_BYTES, files: 1, fields: 1, parts: 2 },
    }),
  )
  @ApiOperation({
    operationId: 'uploadDocumentFile',
    summary: 'Upload one file to a private document version',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        fileRole: { type: 'string', enum: ['MAIN', 'ATTACHMENT'], default: 'MAIN' },
      },
    },
  })
  @ApiCreatedResponse({ type: DocumentFileResponseDto })
  uploadFile(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('fileRole') fileRole?: string,
  ) {
    return this.documents.uploadFile(actor, documentId, file, fileRole ?? 'MAIN');
  }

  @Get('documents/:documentId/files/:fileId/download')
  @RequirePolicyAny('Document.Download', 'Document.DownloadAll')
  @ApiOperation({ operationId: 'downloadDocumentFile' })
  @ApiOkResponse({
    description: 'Authenticated and authorized binary file',
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  })
  async downloadFile(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Param('fileId', new ParseUUIDPipe({ version: '4' })) fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documents.readFile(actor, documentId, fileId, false);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const ascii = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    return new StreamableFile(file.bytes, { type: file.contentType, length: file.bytes.length });
  }

  @Get('documents/:documentId/files/:fileId/preview')
  @RequireAuthenticatedPolicy()
  @ApiOperation({ operationId: 'previewDocumentFile' })
  @ApiOkResponse({
    description: 'Authenticated PDF preview after processing',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  async previewFile(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Param('fileId', new ParseUUIDPipe({ version: '4' })) fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documents.readFile(actor, documentId, fileId, true);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', 'sandbox');
    response.setHeader('Content-Disposition', 'inline');
    return new StreamableFile(file.bytes, { type: 'application/pdf', length: file.bytes.length });
  }
}
