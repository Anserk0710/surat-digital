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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentOrganizationActor } from '../organization/current-organization-actor.decorator.js';
import type { PolicyActor } from './effective-permission.service.js';
import {
  RequireAuthenticatedPolicy,
  RequirePolicyAll,
  RequirePolicyAny,
} from './policy.decorators.js';
import {
  AddGroupMemberDto,
  CreateGroupDto,
  SetGroupActiveDto,
  SetGroupPermissionDto,
  SetGroupPermissionsBatchDto,
  UpdateGroupDto,
} from './policy.dto.js';
import {
  EffectivePermissionResponseDto,
  GroupMemberResponseDto,
  GroupMemberCandidateResponseDto,
  GroupPermissionResponseDto,
  GroupResponseDto,
  PermissionCatalogResponseDto,
} from './policy-response.dto.js';
import { PolicyGuard } from './policy.guard.js';
import { PolicyManagementService } from './policy-management.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('Group Policy')
@Controller('group-policy')
@UseGuards(PolicyGuard)
export class PolicyController {
  constructor(
    @Inject(PolicyManagementService)
    private readonly service: PolicyManagementService,
  ) {}

  @Get('me/effective-permissions')
  @RequireAuthenticatedPolicy()
  @ApiOperation({ operationId: 'groupPolicyMyEffectivePermissions' })
  @ApiOkResponse({ type: EffectivePermissionResponseDto, isArray: true })
  myEffectivePermissions(@CurrentOrganizationActor() actor: PolicyActor) {
    return this.service.getMyEffectivePermissions(actor);
  }

  @Get('permissions')
  @RequirePolicyAny('Group.View', 'Group.Manage')
  @ApiOperation({ operationId: 'groupPolicyListPermissions' })
  @ApiOkResponse({ type: PermissionCatalogResponseDto, isArray: true })
  listPermissionCatalog() {
    return this.service.listPermissionCatalog();
  }

  @Get('groups')
  @RequirePolicyAny('Group.View', 'Group.Manage')
  @ApiOperation({ operationId: 'groupPolicyListGroups' })
  @ApiOkResponse({ type: GroupResponseDto, isArray: true })
  listGroups(@CurrentOrganizationActor() actor: PolicyActor) {
    return this.service.listGroups(actor);
  }

  @Get('groups/:groupId')
  @RequirePolicyAny('Group.View', 'Group.Manage')
  @ApiOperation({ operationId: 'groupPolicyGetGroup' })
  @ApiOkResponse({ type: GroupResponseDto })
  getGroup(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
  ) {
    return this.service.getGroup(actor, groupId);
  }

  @Post('groups')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyCreateGroup' })
  @ApiBody({ type: CreateGroupDto })
  @ApiCreatedResponse({ type: GroupResponseDto })
  createGroup(@CurrentOrganizationActor() actor: PolicyActor, @Body() input: CreateGroupDto) {
    return this.service.createGroup(actor, input);
  }

  @Patch('groups/:groupId')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyUpdateGroup' })
  @ApiBody({ type: UpdateGroupDto })
  @ApiOkResponse({ type: GroupResponseDto })
  updateGroup(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Body() input: UpdateGroupDto,
  ) {
    return this.service.updateGroup(actor, groupId, input);
  }

  @Patch('groups/:groupId/status')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicySetGroupActive' })
  @ApiBody({ type: SetGroupActiveDto })
  @ApiOkResponse({ type: GroupResponseDto })
  setGroupActive(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Body() input: SetGroupActiveDto,
  ) {
    return this.service.setGroupActive(actor, groupId, input.active);
  }

  @Delete('groups/:groupId')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyDeactivateGroup' })
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiOkResponse({ type: GroupResponseDto })
  deactivateGroup(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteGroupPermanently(actor, groupId);
    }
    return this.service.setGroupActive(actor, groupId, false);
  }

  @Get('groups/:groupId/members')
  @RequirePolicyAny('Group.View', 'Group.Manage')
  @ApiOperation({ operationId: 'groupPolicyListMembers' })
  @ApiOkResponse({ type: GroupMemberResponseDto, isArray: true })
  listMembers(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
  ) {
    return this.service.listMembers(actor, groupId);
  }
  @Get('groups/:groupId/member-candidates')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicySearchMemberCandidates' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiOkResponse({ type: GroupMemberCandidateResponseDto, isArray: true })
  searchMemberCandidates(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Query('q') query = '',
  ) {
    return this.service.searchMemberCandidates(actor, groupId, query);
  }

  @Post('groups/:groupId/members')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyAddMember' })
  @ApiBody({ type: AddGroupMemberDto })
  @ApiCreatedResponse({ type: GroupMemberResponseDto })
  addMember(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Body() input: AddGroupMemberDto,
  ) {
    return this.service.addMember(actor, groupId, input.employeeId);
  }

  @Delete('groups/:groupId/members/:employeeId')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyRemoveMember' })
  @ApiOkResponse({ type: GroupMemberResponseDto })
  removeMember(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Param('employeeId', uuid) employeeId: string,
  ) {
    return this.service.removeMember(actor, groupId, employeeId);
  }

  @Get('groups/:groupId/permissions')
  @RequirePolicyAny('Group.View', 'Group.Manage')
  @ApiOperation({ operationId: 'groupPolicyListGroupPermissions' })
  @ApiOkResponse({ type: GroupPermissionResponseDto, isArray: true })
  listPolicies(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
  ) {
    return this.service.listPolicies(actor, groupId);
  }

  @Post('groups/:groupId/permissions')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicySetPermission' })
  @ApiBody({ type: SetGroupPermissionDto })
  @ApiCreatedResponse({ type: GroupPermissionResponseDto })
  setPermission(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Body() input: SetGroupPermissionDto,
  ) {
    return this.service.setPermission(actor, groupId, input);
  }
  @Post('groups/:groupId/permissions/batch')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicySetPermissionsBatch' })
  @ApiBody({ type: SetGroupPermissionsBatchDto })
  @ApiCreatedResponse({ type: GroupPermissionResponseDto, isArray: true })
  setPermissionsBatch(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Body() input: SetGroupPermissionsBatchDto,
  ) {
    return this.service.setPermissionsBatch(actor, groupId, input);
  }

  @Delete('groups/:groupId/permissions/:permissionCode')
  @RequirePolicyAll('Group.Manage', 'System.Configure')
  @ApiOperation({ operationId: 'groupPolicyRemovePermission' })
  @ApiOkResponse({ type: GroupPermissionResponseDto })
  removePermission(
    @CurrentOrganizationActor() actor: PolicyActor,
    @Param('groupId', uuid) groupId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    return this.service.removePermission(actor, groupId, permissionCode);
  }
}
