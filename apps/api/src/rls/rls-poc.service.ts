import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import { RlsContextService } from './rls-context.service.js';

@Injectable()
export class RlsPocService {
  constructor(
    @Inject(RlsContextService)
    private readonly rls: RlsContextService,
  ) {}

  async getResource(actor: PolicyActor, id: string) {
    const resource = await this.rls.run(actor, (tx) =>
      tx.rlsPocResource.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          ownerEmployeeId: true,
          officeId: true,
          label: true,
        },
      }),
    );

    if (!resource) {
      // Jangan membedakan:
      // - resource tidak ada
      // - resource user lain
      // - resource office lain
      throw new ForbiddenException({
        code: 'RLS_ACCESS_DENIED',
        message: 'Access denied.',
      });
    }

    return resource;
  }
}
