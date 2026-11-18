import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PolicyModule } from '../policy/policy.module.js';
import { RegistrationController, UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, PolicyModule],
  controllers: [RegistrationController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}
