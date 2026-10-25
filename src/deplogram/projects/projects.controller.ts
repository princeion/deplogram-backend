import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { ProjectsService } from './projects.service.js';
import type { CreateProjectInput, ProjectEnvValues, ProjectUpdate } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateProjectDto,
  ProjectUpdateDto,
  ProjectEnvValuesDto,
  ProjectDto,
  ProjectSummaryDto,
  NameAvailabilityDto,
  EnvVarRecordDto,
} from './dto.js';

/**
 * Projects and everything about them: the list, their settings, environment
 * variables, runtime logs and metrics.
 */
@ApiTags('projects')
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List all projects with their latest deployment state' })
  @ApiResponse({ status: 200, description: 'Project summaries', type: [ProjectSummaryDto] })
  list() {
    return this.projects.listProjects();
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a project and start its first deployment' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project and deployment created', type: Object })
  @ApiResponse({ status: 409, description: 'Project name already taken' })
  @ApiResponse({ status: 422, description: 'Repository or branch not found' })
  create(@Body() body: CreateProjectInput) {
    return this.projects.createProject(body);
  }

  /** Declared before the `:id` route so "name-availability" is not read as an id. */
  @Get('name-availability')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check if a project name/URL is available' })
  @ApiQuery({ name: 'name', type: String, required: true, example: 'storefront' })
  @ApiResponse({ status: 200, description: 'Name availability result', type: NameAvailabilityDto })
  checkNameAvailability(@Query('name') name: string) {
    return this.projects.checkNameAvailability(name);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get one project with its configuration and variables' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiResponse({ status: 200, description: 'The project', type: ProjectDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  getProject(@Param('id') id: string) {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    return project;
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rename, retarget branch, or change build/start settings' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiBody({ type: ProjectUpdateDto })
  @ApiResponse({ status: 200, description: 'Updated project', type: ProjectDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  updateProject(@Param('id') id: string, @Body() body: ProjectUpdate) {
    return this.projects.updateProject(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Take a project offline and delete its deployments' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  deleteProject(@Param('id') id: string): void {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    this.projects.deleteProject(id);
  }

  @Get(':id/env')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get saved environment variable names (never values)' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiResponse({ status: 200, description: 'Environment variable records', type: [EnvVarRecordDto] })
  @ApiResponse({ status: 404, description: 'Project not found' })
  getEnv(@Param('id') id: string) {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    return this.projects.getEnvVars(id);
  }

  @Put(':id/env')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace the whole variable set. value:null keeps the saved value.' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiBody({ type: ProjectEnvValuesDto })
  @ApiResponse({ status: 200, description: 'Saved variable records', type: [EnvVarRecordDto] })
  @ApiResponse({ status: 404, description: 'Project not found' })
  saveEnv(@Param('id') id: string, @Body() body: ProjectEnvValues) {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    return this.projects.saveEnvVars(id, body);
  }

  @Get(':id/logs')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the live deployment runtime log' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiQuery({ name: 'after', type: Number, required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Runtime log lines', type: Object })
  @ApiResponse({ status: 404, description: 'Project not found' })
  getRuntimeLogs(@Param('id') id: string, @Query('after') after?: string) {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    return this.projects.getRuntimeLogs(id, Number(after ?? 0));
  }

  @Get(':id/metrics')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get traffic, latency and resources for the live deployment' })
  @ApiParam({ name: 'id', type: String, example: 'proj_storefront' })
  @ApiQuery({ name: 'range', type: String, required: false, enum: ['1h', '24h', '7d'], example: '24h' })
  @ApiResponse({ status: 200, description: 'Deployment metrics', type: Object })
  @ApiResponse({ status: 404, description: 'Project not found' })
  getMetrics(@Param('id') id: string, @Query('range') range: string) {
    const project = this.projects.getProject(id);
    if (!project) throw new NotFoundException('That project does not exist.');
    return this.projects.getMetrics(id, range);
  }
}
