import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { ProjectsService } from './projects.service.js';
import type {
  CreateProjectInput,
  ProjectEnvValues,
  ProjectUpdate,
} from '../types.js';

/**
 * Projects and everything about them: the list, their settings, environment
 * variables, runtime logs and metrics.
 */
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @HttpCode(200)
  list() {
    return this.projects.listProjects();
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateProjectInput) {
    return this.projects.createProject(body);
  }

  /** Declared before the `:id` route so "name-availability" is not read as an id. */
  @Get('name-availability')
  @HttpCode(200)
  checkNameAvailability(@Query('name') name: string) {
    return this.projects.checkNameAvailability(name);
  }

  @Get(':id')
  @HttpCode(200)
  getProject(@Param('id') id: string) {
    return this.projects.getProject(id);
  }

  @Patch(':id')
  @HttpCode(200)
  updateProject(@Param('id') id: string, @Body() body: ProjectUpdate) {
    return this.projects.updateProject(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteProject(@Param('id') id: string): void {
    this.projects.deleteProject(id);
  }

  @Get(':id/env')
  @HttpCode(200)
  getEnv(@Param('id') id: string) {
    return this.projects.getEnvVars(id);
  }

  @Put(':id/env')
  @HttpCode(200)
  saveEnv(@Param('id') id: string, @Body() body: ProjectEnvValues) {
    return this.projects.saveEnvVars(id, body);
  }

  @Get(':id/logs')
  @HttpCode(200)
  getRuntimeLogs(@Param('id') id: string, @Query('after') after?: string) {
    return this.projects.getRuntimeLogs(id, Number(after ?? 0));
  }

  @Get(':id/metrics')
  @HttpCode(200)
  getMetrics(@Param('id') id: string, @Query('range') range: string) {
    return this.projects.getMetrics(id, range);
  }
}
