import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PolicyModule } from '../policy/policy.module.js';
import { RlsModule } from '../rls/rls.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { PrivateFileStorage } from './private-file-storage.js';

@Module({
  imports: [AuthModule, PolicyModule, RlsModule],

  controllers: [DocumentController],

  providers: [DocumentService, PrivateFileStorage],

  exports: [DocumentService],
})
export class DocumentModule {}
