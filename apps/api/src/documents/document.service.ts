import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import { RlsContextService } from '../rls/rls-context.service.js';
import type {
  CreateDocumentDraftDto,
  ListDocumentsQueryDto,
  UpdateDocumentDraftDto,
} from './document.dto.js';
import { validateDocumentFile } from './file-validation.js';
import { PrivateFileStorage } from './private-file-storage.js';

const documentSelect = {
  id: true,
  companyId: true,
  documentTypeId: true,
  documentSubtypeId: true,
  creatorEmployeeId: true,
  issuerOfficeId: true,
  issuerDivisionId: true,
  title: true,
  description: true,
  status: true,
  revision: true,
  createdAt: true,
  updatedAt: true,

  documentType: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
  },

  documentSubtype: {
    select: {
      id: true,
      documentTypeId: true,
      code: true,
      name: true,
      description: true,
    },
  },

  issuerOffice: {
    select: {
      id: true,
      code: true,
      name: true,
      timezone: true,
    },
  },

  issuerDivision: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },

  creator: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
    },
  },
} satisfies Prisma.DocumentSelect;

const fileSelect = {
  id: true,
  documentVersionId: true,
  fileRole: true,
  originalFilename: true,
  detectedMime: true,
  sizeBytes: true,
  sha256: true,
  processingStatus: true,
  reviewStatus: true,
  createdAt: true,
} satisfies Prisma.DocumentFileSelect;

function toFileResponse(file: Prisma.DocumentFileGetPayload<{ select: typeof fileSelect }>) {
  return file;
}

@Injectable()
export class DocumentService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(RlsContextService)
    private readonly rls: RlsContextService,

    @Inject(PrivateFileStorage)
    private readonly storage: PrivateFileStorage,
  ) {}

  async listFiles(actor: PolicyActor, documentId: string) {
    return this.rls.runIdentity(actor, async (tx) => {
      const document = await tx.document.findUnique({
        where: { id: documentId },
        select: { id: true },
      });
      if (!document) {
        throw this.notFound();
      }
      const files = await tx.documentFile.findMany({
        where: { version: { documentId } },
        select: fileSelect,
        orderBy: { createdAt: 'asc' },
      });
      return files.map(toFileResponse);
    });
  }

  async uploadFile(
    actor: PolicyActor,
    documentId: string,
    file: Express.Multer.File | undefined,
    role: string,
  ) {
    if (role !== 'MAIN' && role !== 'ATTACHMENT') {
      throw new BadRequestException({ code: 'FILE_ROLE_INVALID', message: 'Invalid file role.' });
    }
    const validated = validateDocumentFile(file);
    await this.rls.runIdentity(actor, async (tx) => {
      const document = await tx.document.findUnique({
        where: { id: documentId },
        select: { creatorEmployeeId: true, companyId: true, status: true },
      });
      this.assertUploadable(document, actor);
    });

    const extension = validated.filename.split('.').pop()!.toLowerCase();
    const object = await this.storage.save(
      actor.companyId,
      validated.contentType,
      extension,
      validated.buffer,
    );
    try {
      return await this.rls.runIdentity(actor, async (tx) => {
        // The document row serializes concurrent file mutations.
        const changed = await tx.document.updateMany({
          where: {
            id: documentId,
            companyId: actor.companyId,
            creatorEmployeeId: actor.employeeId,
            status: 'DRAFT',
          },
          data: { revision: { increment: 1 } },
        });
        if (changed.count !== 1) {
          throw this.notFound();
        }
        const version =
          (await tx.documentVersion.findUnique({
            where: { documentId_versionNo: { documentId, versionNo: 1 } },
            select: { id: true, isLocked: true },
          })) ??
          (await tx.documentVersion.create({
            data: {
              documentId,
              versionNo: 1,
              sourceMethod: 'UPLOAD',
              createdByEmployeeId: actor.employeeId,
            },
            select: { id: true, isLocked: true },
          }));
        if (version.isLocked) {
          throw new ConflictException({ code: 'DOCUMENT_VERSION_LOCKED' });
        }
        if (role === 'MAIN') {
          const existing = await tx.documentFile.findFirst({
            where: { documentVersionId: version.id, fileRole: 'MAIN' },
            select: { id: true },
          });
          if (existing) {
            throw new ConflictException({
              code: 'DOCUMENT_MAIN_FILE_EXISTS',
              message: 'Main file already exists.',
            });
          }
        }
        const stored = await tx.storageObject.create({
          data: {
            companyId: actor.companyId,
            uploadedByEmployeeId: actor.employeeId,
            provider: object.provider,
            pathname: object.pathname,
            contentType: validated.contentType,
            sizeBytes: validated.sizeBytes,
            sha256: validated.sha256,
            accessMode: 'PRIVATE',
          },
          select: { id: true },
        });
        const result = await tx.documentFile.create({
          data: {
            documentVersionId: version.id,
            storageObjectId: stored.id,
            uploadedByEmployeeId: actor.employeeId,
            fileRole: role,
            originalFilename: validated.filename,
            detectedMime: validated.contentType,
            sizeBytes: validated.sizeBytes,
            sha256: validated.sha256,
            processingStatus: 'UPLOADED',
            reviewStatus: 'PENDING',
          },
          select: fileSelect,
        });
        return toFileResponse(result);
      });
    } catch (error) {
      await this.storage.remove(object).catch(() => undefined);
      throw error;
    }
  }

  async readFile(actor: PolicyActor, documentId: string, fileId: string, preview: boolean) {
    const lookup = async (tx: Prisma.TransactionClient) => {
      const document = await tx.document.findUnique({
        where: { id: documentId },
        select: { id: true },
      });
      if (!document) {
        throw this.notFound();
      }
      const result = await tx.documentFile.findFirst({
        where: { id: fileId, version: { documentId } },
        select: {
          originalFilename: true,
          detectedMime: true,
          sha256: true,
          sizeBytes: true,
          processingStatus: true,
          storageObject: {
            select: {
              provider: true,
              pathname: true,
              companyId: true,
              accessMode: true,
              contentType: true,
              sizeBytes: true,
              sha256: true,
            },
          },
        },
      });
      if (!result) {
        throw this.fileNotFound();
      }
      return result;
    };
    const file = preview
      ? await this.rls.runIdentity(actor, lookup)
      : await this.rls.runDocumentDownload(actor, lookup);
    if (
      preview &&
      (file.detectedMime !== 'application/pdf' || file.processingStatus !== 'PREVIEW_READY')
    ) {
      throw new ConflictException({
        code: 'FILE_PREVIEW_NOT_READY',
        message: 'Preview is not ready.',
      });
    }
    if (
      file.storageObject.companyId !== actor.companyId ||
      file.storageObject.accessMode !== 'PRIVATE' ||
      file.storageObject.contentType !== file.detectedMime ||
      file.storageObject.sizeBytes !== file.sizeBytes ||
      file.storageObject.sha256 !== file.sha256
    ) {
      throw new ServiceUnavailableException({
        code: 'FILE_INTEGRITY_FAILED',
        message: 'File is temporarily unavailable.',
      });
    }
    const bytes = await this.storage.read(file.storageObject);
    if (
      !bytes ||
      bytes.length !== file.sizeBytes ||
      createHash('sha256').update(bytes).digest('hex') !== file.sha256
    ) {
      throw new ServiceUnavailableException({
        code: 'FILE_INTEGRITY_FAILED',
        message: 'File is temporarily unavailable.',
      });
    }
    return { bytes, filename: file.originalFilename, contentType: file.detectedMime };
  }

  private assertUploadable(
    document: { creatorEmployeeId: string; companyId: string; status: string } | null,
    actor: PolicyActor,
  ): void {
    if (
      !document ||
      document.companyId !== actor.companyId ||
      document.creatorEmployeeId !== actor.employeeId
    ) {
      throw this.notFound();
    }
    if (document.status !== 'DRAFT') {
      throw new ConflictException({ code: 'DOCUMENT_NOT_DRAFT' });
    }
  }

  private fileNotFound(): NotFoundException {
    return new NotFoundException({ code: 'DOCUMENT_FILE_NOT_FOUND', message: 'File not found.' });
  }

  listDocumentTypes() {
    return this.prisma.documentType.findMany({
      where: {
        active: true,
      },

      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },

      orderBy: [
        {
          name: 'asc',
        },
        {
          code: 'asc',
        },
      ],
    });
  }

  listDocumentSubtypes(documentTypeId?: string) {
    return this.prisma.documentSubtype.findMany({
      where: {
        active: true,

        documentType: {
          active: true,
        },

        ...(documentTypeId
          ? {
              documentTypeId,
            }
          : {}),
      },

      select: {
        id: true,
        documentTypeId: true,
        code: true,
        name: true,
        description: true,
      },

      orderBy: [
        {
          documentTypeId: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async listIssuerScopes(actor: PolicyActor) {
    const today = this.todayUtc();

    const assignments = await this.prisma.employeeAssignment.findMany({
      where: {
        employeeId: actor.employeeId,

        active: true,

        OR: [
          {
            validFrom: null,
          },
          {
            validFrom: {
              lte: today,
            },
          },
        ],

        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: today,
                },
              },
            ],
          },
        ],

        employee: {
          companyId: actor.companyId,

          status: 'ACTIVE',
        },

        officeDivision: {
          active: true,

          office: {
            active: true,
            companyId: actor.companyId,
          },

          division: {
            active: true,
            companyId: actor.companyId,
          },
        },
      },

      select: {
        officeDivisionId: true,

        isPrimary: true,

        officeDivision: {
          select: {
            office: {
              select: {
                id: true,
                code: true,
                name: true,
                timezone: true,
              },
            },

            division: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    return assignments.map((assignment) => ({
      officeDivisionId: assignment.officeDivisionId,

      isPrimary: assignment.isPrimary,

      office: assignment.officeDivision.office,

      division: assignment.officeDivision.division,
    }));
  }

  async createDraft(actor: PolicyActor, input: CreateDocumentDraftDto) {
    return this.rls.runIdentity(
      actor,

      async (tx) => {
        await this.assertClassification(tx, input.documentTypeId, input.documentSubtypeId);

        await this.assertIssuerScope(tx, actor, input.issuerOfficeId, input.issuerDivisionId);

        return tx.document.create({
          data: {
            companyId: actor.companyId,

            creatorEmployeeId: actor.employeeId,

            documentTypeId: input.documentTypeId,

            documentSubtypeId: input.documentSubtypeId,

            issuerOfficeId: input.issuerOfficeId,

            issuerDivisionId: input.issuerDivisionId,

            title: input.title.trim(),

            description: this.normalizeDescription(input.description),

            status: 'DRAFT',

            revision: 1,
          },

          select: documentSelect,
        });
      },
    );
  }

  async listDocuments(actor: PolicyActor, query: ListDocumentsQueryDto) {
    // Query parameters arrive as strings when runtime metadata is unavailable.
    const limit = Number(query.limit ?? 50);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_LIMIT',
        message: 'Limit must be an integer between 1 and 100.',
      });
    }

    const scope = query.scope ?? 'mine';

    if (scope !== 'mine' && scope !== 'accessible') {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_SCOPE',
        message: 'Invalid document scope.',
      });
    }

    return this.rls.runIdentity(
      actor,

      async (tx) => {
        const take = limit + 1;

        const rows = await tx.document.findMany({
          where: {
            companyId: actor.companyId,

            ...(scope === 'mine'
              ? {
                  creatorEmployeeId: actor.employeeId,
                }
              : {}),

            ...(query.status
              ? {
                  status: query.status,
                }
              : {}),

            ...(query.documentTypeId
              ? {
                  documentTypeId: query.documentTypeId,
                }
              : {}),
          },

          select: documentSelect,

          orderBy: [
            {
              createdAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],

          ...(query.cursor
            ? {
                cursor: {
                  id: query.cursor,
                },

                skip: 1,
              }
            : {}),

          take,
        });

        const hasMore = rows.length > limit;

        const items = hasMore ? rows.slice(0, limit) : rows;

        return {
          items,

          nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
        };
      },
    );
  }

  async getDocument(actor: PolicyActor, documentId: string) {
    return this.rls.runIdentity(
      actor,

      async (tx) => {
        const document = await tx.document.findUnique({
          where: {
            id: documentId,
          },

          select: documentSelect,
        });

        if (!document) {
          throw this.notFound();
        }

        return document;
      },
    );
  }

  async updateDraft(actor: PolicyActor, documentId: string, input: UpdateDocumentDraftDto) {
    return this.rls.runIdentity(
      actor,

      async (tx) => {
        const current = await tx.document.findUnique({
          where: {
            id: documentId,
          },

          select: {
            id: true,

            creatorEmployeeId: true,

            documentTypeId: true,

            documentSubtypeId: true,

            issuerOfficeId: true,

            issuerDivisionId: true,

            status: true,
            revision: true,
          },
        });

        // RLS menghasilkan null untuk resource
        // yang tidak boleh diketahui user.
        if (!current) {
          throw this.notFound();
        }

        // Document.ViewAll boleh membaca,
        // tetapi tidak boleh edit Draft orang lain.
        if (current.creatorEmployeeId !== actor.employeeId) {
          throw this.notFound();
        }

        if (current.status !== 'DRAFT') {
          throw new ConflictException({
            code: 'DOCUMENT_NOT_DRAFT',

            message: 'Document is no longer editable as a draft.',
          });
        }

        if (current.revision !== input.expectedRevision) {
          throw new ConflictException({
            code: 'DOCUMENT_REVISION_CONFLICT',

            message: 'Document has changed. Reload the latest revision before saving.',
          });
        }

        const documentTypeId = input.documentTypeId ?? current.documentTypeId;

        const documentSubtypeId = input.documentSubtypeId ?? current.documentSubtypeId;

        const issuerOfficeId = input.issuerOfficeId ?? current.issuerOfficeId;

        const issuerDivisionId = input.issuerDivisionId ?? current.issuerDivisionId;

        await this.assertClassification(tx, documentTypeId, documentSubtypeId);

        await this.assertIssuerScope(tx, actor, issuerOfficeId, issuerDivisionId);

        const result = await tx.document.updateMany({
          where: {
            id: documentId,

            companyId: actor.companyId,

            creatorEmployeeId: actor.employeeId,

            status: 'DRAFT',

            revision: input.expectedRevision,
          },

          data: {
            ...(input.documentTypeId !== undefined
              ? {
                  documentTypeId: input.documentTypeId,
                }
              : {}),

            ...(input.documentSubtypeId !== undefined
              ? {
                  documentSubtypeId: input.documentSubtypeId,
                }
              : {}),

            ...(input.issuerOfficeId !== undefined
              ? {
                  issuerOfficeId: input.issuerOfficeId,
                }
              : {}),

            ...(input.issuerDivisionId !== undefined
              ? {
                  issuerDivisionId: input.issuerDivisionId,
                }
              : {}),

            ...(input.title !== undefined
              ? {
                  title: input.title.trim(),
                }
              : {}),

            ...(input.description !== undefined
              ? {
                  description: this.normalizeDescription(input.description),
                }
              : {}),

            revision: {
              increment: 1,
            },
          },
        });

        // Bisa terjadi bila dua request lolos read
        // lalu salah satunya lebih dahulu update.
        if (result.count !== 1) {
          throw new ConflictException({
            code: 'DOCUMENT_REVISION_CONFLICT',

            message: 'Document has changed. Reload the latest revision before saving.',
          });
        }

        return tx.document.findUniqueOrThrow({
          where: {
            id: documentId,
          },

          select: documentSelect,
        });
      },
    );
  }

  private async assertClassification(
    tx: Prisma.TransactionClient,
    documentTypeId: string,
    documentSubtypeId: string,
  ): Promise<void> {
    const classification = await tx.documentSubtype.findFirst({
      where: {
        id: documentSubtypeId,

        documentTypeId,

        active: true,

        documentType: {
          active: true,
        },
      },

      select: {
        id: true,
      },
    });

    if (!classification) {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_CLASSIFICATION',

        message: 'Document type and subtype combination is invalid.',
      });
    }
  }

  private async assertIssuerScope(
    tx: Prisma.TransactionClient,
    actor: PolicyActor,
    officeId: string,
    divisionId: string,
  ): Promise<void> {
    const today = this.todayUtc();

    const assignment = await tx.employeeAssignment.findFirst({
      where: {
        employeeId: actor.employeeId,

        active: true,

        OR: [
          {
            validFrom: null,
          },
          {
            validFrom: {
              lte: today,
            },
          },
        ],

        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: today,
                },
              },
            ],
          },
        ],

        employee: {
          companyId: actor.companyId,

          status: 'ACTIVE',
        },

        officeDivision: {
          officeId,

          divisionId,

          active: true,

          office: {
            active: true,
            companyId: actor.companyId,
          },

          division: {
            active: true,
            companyId: actor.companyId,
          },
        },
      },

      select: {
        id: true,
      },
    });

    if (!assignment) {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_ISSUER_SCOPE',

        message: 'Issuer office and division are not available to the current creator.',
      });
    }
  }

  private todayUtc(): Date {
    const today = new Date().toISOString().slice(0, 10);

    return new Date(`${today}T00:00:00.000Z`);
  }

  private normalizeDescription(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'DOCUMENT_NOT_FOUND',

      message: 'Document not found.',
    });
  }
}
