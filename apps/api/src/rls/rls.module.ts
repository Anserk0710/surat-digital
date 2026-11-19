import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PolicyModule } from '../policy/policy.module.js';

import { RlsContextService } from './rls-context.service.js';
import { RlsPocController } from './rls-poc.controller.js';
import { RlsPocService } from './rls-poc.service.js';

@Module({
  imports: [AuthModule, PolicyModule],

  controllers: [RlsPocController],

  providers: [RlsContextService, RlsPocService],

  exports: [RlsContextService],
})
export class RlsModule {}
