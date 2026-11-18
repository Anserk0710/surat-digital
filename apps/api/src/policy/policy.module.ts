import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { EffectivePermissionService } from './effective-permission.service.js';
import { PolicyController } from './policy.controller.js';
import { PolicyGuard } from './policy.guard.js';
import { PolicyManagementService } from './policy-management.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PolicyController],
  providers: [EffectivePermissionService, PolicyGuard, PolicyManagementService],
  exports: [EffectivePermissionService, PolicyGuard],
})
export class PolicyModule {}
