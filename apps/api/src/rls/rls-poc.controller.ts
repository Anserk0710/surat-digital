import { Controller, Get, Inject, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOrganizationActor } from '../organization/current-organization-actor.decorator.js';
import type { PolicyActor } from '../policy/effective-permission.service.js';
import { RequireAuthenticatedPolicy } from '../policy/policy.decorators.js';
import { PolicyGuard } from '../policy/policy.guard.js';
import { RlsPocResourceResponseDto } from './rls-poc-response.dto.js';
import { RlsPocService } from './rls-poc.service.js';

@ApiTags('RLS POC')
@Controller('rls-poc')
@UseGuards(PolicyGuard)
export class RlsPocController {
  constructor(
    @Inject(RlsPocService)
    private readonly service: RlsPocService,
  ) {}

  @Get('resources/:id')
  @RequireAuthenticatedPolicy()
  @ApiOperation({
    operationId: 'rlsPocGetResource',
    summary: 'P07 diagnostic read through transaction-local RLS context',
  })
  @ApiOkResponse({
    type: RlsPocResourceResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Resource is outside the active employee/office RLS scope.',
  })
  getResource(
    @CurrentOrganizationActor()
    actor: PolicyActor,

    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ) {
    return this.service.getResource(actor, id);
  }
}
