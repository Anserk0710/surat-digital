import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CurrentOrganizationActor } from './current-organization-actor.decorator.js';
import {
  CreateAssignmentDto,
  CreateCompanyDto,
  CreateMasterDto,
  CreateOfficeDivisionDto,
  CreateOfficeDto,
  UpdateOfficeDivisionDto,
  UpdateAssignmentDto,
  UpdateCompanyDto,
  UpdateMasterDto,
  UpdateOfficeDto,
} from './organization.dto.js';
import { OrganizationAccessGuard, type OrganizationActor } from './organization-access.guard.js';
import { RequirePlatformAdmin, RequirePlatformOrPolicyAny } from '../policy/policy.decorators.js';
import { RequireOrganizationPermissions as Permissions } from './organization-permissions.js';
import {
  CompanyResponseDto,
  DivisionResponseDto,
  EmployeeAssignmentResponseDto,
  JobTitleResponseDto,
  OfficeDivisionResponseDto,
  OfficeResponseDto,
} from './organization-response.dto.js';
import { OrganizationService } from './organization.service.js';

const idParam = new ParseUUIDPipe({ version: '4' });

@ApiTags('Organization')
@Controller('organization')
@UseGuards(OrganizationAccessGuard)
export class OrganizationController {
  constructor(
    @Inject(OrganizationService)
    private readonly service: OrganizationService,
  ) {}

  @Get('changes/:type/:id')
  @RequirePlatformOrPolicyAny('System.Configure', 'User.View')
  async listChanges(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('type') type: string,
    @Param('id', idParam) id: string,
  ) {
    return this.service.listChanges(actor, type, id);
  }

  // ---------------------------------------------------------
  // Company
  // ---------------------------------------------------------

  @Get('companies')
  @RequirePlatformOrPolicyAny('System.Configure', 'User.View')
  @ApiOkResponse({ type: CompanyResponseDto, isArray: true })
  @ApiOperation({ operationId: 'organizationListCompanies' })
  async listCompanies(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listCompanies(actor);
  }

  @Post('companies')
  @RequirePlatformAdmin()
  @ApiBody({ type: CreateCompanyDto })
  @ApiCreatedResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationCreateCompany' })
  async createCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateCompanyDto,
  ) {
    return this.service.createCompany(actor, input);
  }

  @Get('companies/:id')
  @RequirePlatformOrPolicyAny('System.Configure', 'User.View')
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationGetCompany' })
  async getCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getCompany(actor, id);
  }

  @Patch('companies/:id')
  @RequirePlatformOrPolicyAny('System.Configure')
  @ApiBody({ type: UpdateCompanyDto })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationUpdateCompany' })
  async updateCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateCompanyDto,
  ) {
    return this.service.updateCompany(actor, id, input);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformAdmin()
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationDeactivateCompany' })
  async deactivateCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
    @Query('force') force?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteCompanyPermanently(actor, id, force === 'true');
    }
    return this.service.deactivateCompany(actor, id, force === 'true');
  }

  // ---------------------------------------------------------
  // Offices
  // ---------------------------------------------------------

  @Get('offices')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: OfficeResponseDto, isArray: true })
  async listOffices(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listMasters(actor, 'office');
  }

  @Get('offices/:id')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: OfficeResponseDto })
  async getOffice(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getMaster(actor, 'office', id);
  }

  @Post('offices')
  @Permissions('System.Configure')
  @ApiBody({ type: CreateOfficeDto })
  @ApiCreatedResponse({ type: OfficeResponseDto })
  async createOffice(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateOfficeDto,
  ) {
    return this.service.createOffice(actor, input);
  }

  @Patch('offices/:id')
  @Permissions('System.Configure')
  @ApiBody({ type: UpdateOfficeDto })
  @ApiOkResponse({ type: OfficeResponseDto })
  async updateOffice(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateOfficeDto,
  ) {
    return this.service.updateMaster(actor, 'office', id, input);
  }

  @Delete('offices/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiOkResponse({ type: OfficeResponseDto })
  async deactivateOffice(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
    @Query('force') force?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'office', id);
    }
    return this.service.deactivateMaster(actor, 'office', id, force === 'true');
  }

  // ---------------------------------------------------------
  // Divisions
  // ---------------------------------------------------------

  @Get('divisions')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: DivisionResponseDto, isArray: true })
  async listDivisions(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listMasters(actor, 'division');
  }

  @Get('divisions/:id')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: DivisionResponseDto })
  async getDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getMaster(actor, 'division', id);
  }

  @Post('divisions')
  @Permissions('System.Configure')
  @ApiBody({ type: CreateMasterDto })
  @ApiCreatedResponse({ type: DivisionResponseDto })
  async createDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateMasterDto,
  ) {
    return this.service.createMaster(actor, 'division', input);
  }

  @Patch('divisions/:id')
  @Permissions('System.Configure')
  @ApiBody({ type: UpdateMasterDto })
  @ApiOkResponse({ type: DivisionResponseDto })
  async updateDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateMasterDto,
  ) {
    return this.service.updateMaster(actor, 'division', id, input);
  }

  @Delete('divisions/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiOkResponse({ type: DivisionResponseDto })
  async deactivateDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
    @Query('force') force?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'division', id);
    }
    return this.service.deactivateMaster(actor, 'division', id, force === 'true');
  }

  // ---------------------------------------------------------
  // Job titles
  // ---------------------------------------------------------

  @Get('job-titles')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: JobTitleResponseDto, isArray: true })
  async listJobTitles(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listMasters(actor, 'jobTitle');
  }

  @Get('job-titles/:id')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: JobTitleResponseDto })
  async getJobTitle(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getMaster(actor, 'jobTitle', id);
  }

  @Post('job-titles')
  @Permissions('System.Configure')
  @ApiBody({ type: CreateMasterDto })
  @ApiCreatedResponse({ type: JobTitleResponseDto })
  async createJobTitle(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateMasterDto,
  ) {
    return this.service.createMaster(actor, 'jobTitle', input);
  }

  @Patch('job-titles/:id')
  @Permissions('System.Configure')
  @ApiBody({ type: UpdateMasterDto })
  @ApiOkResponse({ type: JobTitleResponseDto })
  async updateJobTitle(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateMasterDto,
  ) {
    return this.service.updateMaster(actor, 'jobTitle', id, input);
  }

  @Delete('job-titles/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiOkResponse({ type: JobTitleResponseDto })
  async deactivateJobTitle(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
    @Query('force') force?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'jobTitle', id);
    }
    return this.service.deactivateMaster(actor, 'jobTitle', id, force === 'true');
  }

  // ---------------------------------------------------------
  // OfficeDivision mapping
  // ---------------------------------------------------------

  @Get('office-divisions')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: OfficeDivisionResponseDto, isArray: true })
  async listOfficeDivisions(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listOfficeDivisions(actor);
  }

  @Get('office-divisions/:id')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: OfficeDivisionResponseDto })
  async getOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getOfficeDivision(actor, id);
  }

  @Post('office-divisions')
  @Permissions('System.Configure')
  @ApiBody({ type: CreateOfficeDivisionDto })
  @ApiCreatedResponse({ type: OfficeDivisionResponseDto })
  async createOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateOfficeDivisionDto,
  ) {
    return this.service.createOfficeDivision(actor, input);
  }

  @Patch('office-divisions/:id')
  @Permissions('System.Configure')
  @ApiBody({ type: UpdateOfficeDivisionDto })
  @ApiOkResponse({ type: OfficeDivisionResponseDto })
  async updateOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateOfficeDivisionDto,
  ) {
    return this.service.updateOfficeDivision(actor, id, input);
  }

  @Delete('office-divisions/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiOkResponse({ type: OfficeDivisionResponseDto })
  async deactivateOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
    @Query('force') force?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteOfficeDivisionPermanently(actor, id);
    }
    return this.service.updateOfficeDivision(actor, id, { active: false }, force === 'true');
  }

  // ---------------------------------------------------------
  // Employee assignments
  // ---------------------------------------------------------

  @Get('assignments')
  @Permissions('System.Configure', 'User.View', 'User.Manage')
  @ApiOkResponse({ type: EmployeeAssignmentResponseDto, isArray: true })
  async listAssignments(@CurrentOrganizationActor() actor: OrganizationActor) {
    return this.service.listAssignments(actor);
  }

  @Get('assignments/:id')
  @Permissions('System.Configure', 'User.View', 'User.Manage')
  @ApiOkResponse({ type: EmployeeAssignmentResponseDto })
  async getAssignment(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    return this.service.getAssignment(actor, id);
  }

  @Post('assignments')
  @Permissions('User.Manage')
  @ApiBody({ type: CreateAssignmentDto })
  @ApiCreatedResponse({ type: EmployeeAssignmentResponseDto })
  async createAssignment(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Body() input: CreateAssignmentDto,
  ) {
    return this.service.createAssignment(actor, input);
  }

  @Patch('assignments/:id')
  @Permissions('User.Manage')
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiOkResponse({ type: EmployeeAssignmentResponseDto })
  async updateAssignment(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateAssignmentDto,
  ) {
    return this.service.updateAssignment(actor, id, input);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('User.Manage')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiOkResponse({ type: EmployeeAssignmentResponseDto })
  async deactivateAssignment(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteAssignmentPermanently(actor, id);
    }
    return this.service.deactivateAssignment(actor, id);
  }
}
