import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentOrganizationActor } from '../organization/current-organization-actor.decorator.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import { RequireAuthenticatedPolicy, RequirePolicyAny } from '../policy/policy.decorators.js';
import { PolicyGuard } from '../policy/policy.guard.js';
import { AuthRateLimitGuard } from '../security/auth-rate-limit.guard.js';
import {
  ImportResultDto,
  RegisterUserDto,
  SetUserStatusDto,
  UpdateProfileDto,
  UserResponseDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthRateLimitGuard)
export class RegistrationController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Post('register')
  @ApiOperation({ operationId: 'usersRegister' })
  @ApiCreatedResponse({ schema: { properties: { accepted: { type: 'boolean' } } } })
  register(@Body() input: RegisterUserDto) {
    return this.service.register(input);
  }
}

@ApiTags('Users')
@Controller('users')
@UseGuards(PolicyGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get()
  @RequirePolicyAny('User.View', 'User.Manage')
  @ApiOperation({ operationId: 'usersList' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  list(@CurrentOrganizationActor() actor: PolicyActor) {
    return this.service.list(actor);
  }

  @Get('me/profile')
  @RequireAuthenticatedPolicy()
  @ApiOperation({ operationId: 'usersMyProfile' })
  @ApiOkResponse({ type: UserResponseDto })
  profile(@CurrentOrganizationActor() actor: PolicyActor) {
    return this.service.profile(actor);
  }

  @Patch('me/profile')
  @RequireAuthenticatedPolicy()
  @ApiOperation({ operationId: 'usersUpdateMyProfile' })
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(@CurrentOrganizationActor() actor: PolicyActor, @Body() input: UpdateProfileDto) {
    return this.service.updateProfile(actor, input);
  }

  @Patch(':id/status')
  @RequirePolicyAny('User.Manage')
  @ApiOperation({ operationId: 'usersSetStatus' })
  @ApiOkResponse({ type: UserResponseDto })
  setStatus(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: SetUserStatusDto,
  ) {
    return this.service.setStatus(actor, id, input.status);
  }

  @Delete(':id')
  @RequirePolicyAny('User.Manage')
  @ApiOperation({ operationId: 'usersDelete' })
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiOkResponse({ type: UserResponseDto })
  delete(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deletePermanently(actor, id);
    }
    return this.service.setStatus(actor, id, 'INACTIVE');
  }

  @Post('import')
  @RequirePolicyAny('User.Manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2_000_000, files: 1 } }))
  @ApiOperation({ operationId: 'usersImportExcel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: ImportResultDto })
  importExcel(
    @CurrentOrganizationActor() actor: PolicyActor,
    @UploadedFile() file?: { size: number; originalname: string; buffer: Buffer },
  ) {
    return this.service.importExcel(actor, file);
  }
}
