import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
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
  CreateMasterDto,
  CreateOfficeDivisionDto,
  CreateOfficeDto,
  UpdateActiveDto,
  UpdateAssignmentDto,
  UpdateCompanyDto,
  UpdateMasterDto,
  UpdateOfficeDto,
} from './organization.dto.js';
import { OrganizationAccessGuard, type OrganizationActor } from './organization-access.guard.js';
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

  // ---------------------------------------------------------
  // Company
  // ---------------------------------------------------------

  @Get('companies')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: CompanyResponseDto, isArray: true })
  @ApiOperation({ operationId: 'organizationListCompanies' })
  async listCompanies(@CurrentOrganizationActor() actor: OrganizationActor) {
    return [await this.service.getCompany(actor)];
  }

  @Get('companies/:id')
  @Permissions('System.Configure', 'User.View')
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationGetCompany' })
  async getCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    if (id !== actor.companyId) {
      throw new NotFoundException('Company not found.');
    }

    return this.service.getCompany(actor);
  }

  @Patch('companies/:id')
  @Permissions('System.Configure')
  @ApiBody({ type: UpdateCompanyDto })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationUpdateCompany' })
  async updateCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateCompanyDto,
  ) {
    if (id !== actor.companyId) {
      throw new NotFoundException('Company not found.');
    }

    return this.service.updateCompany(actor, input);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiOperation({ operationId: 'organizationDeactivateCompany' })
  async deactivateCompany(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
  ) {
    if (id !== actor.companyId) {
      throw new NotFoundException('Company not found.');
    }

    return this.service.deactivateCompany(actor);
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
  @ApiOkResponse({ type: OfficeResponseDto })
  async deactivateOffice(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'office', id);
    }
    return this.service.deactivateMaster(actor, 'office', id);
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
  @ApiOkResponse({ type: DivisionResponseDto })
  async deactivateDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'division', id);
    }
    return this.service.deactivateMaster(actor, 'division', id);
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
  @ApiOkResponse({ type: JobTitleResponseDto })
  async deactivateJobTitle(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteMasterPermanently(actor, 'jobTitle', id);
    }
    return this.service.deactivateMaster(actor, 'jobTitle', id);
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
  @ApiBody({ type: UpdateActiveDto })
  @ApiOkResponse({ type: OfficeDivisionResponseDto })
  async updateOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Body() input: UpdateActiveDto,
  ) {
    return this.service.updateOfficeDivision(actor, id, input.active);
  }

  @Delete('office-divisions/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('System.Configure')
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiOkResponse({ type: OfficeDivisionResponseDto })
  async deactivateOfficeDivision(
    @CurrentOrganizationActor() actor: OrganizationActor,
    @Param('id', idParam) id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.service.deleteOfficeDivisionPermanently(actor, id);
    }
    return this.service.updateOfficeDivision(actor, id, false);
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
