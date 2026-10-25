import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { DeploymentService } from './deployments.service.js';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  DeploymentDto,
  DeploymentLogsDto,
  DeploymentPageDto,
  RollbackResultDto,
} from './dto.js';

/**
 * Deployments: the list, one deployment, its build log, and the actions that
 * create or undo deployments.
 */
@ApiTags('deployments')
@Controller('v1/deployments')
export class DeploymentController {
  constructor(private readonly deployments: DeploymentService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List deployments with filtering, sorting and paging' })
  @ApiQuery({ name: 'q', type: String, required: false, example: 'storefront' })
  @ApiQuery({ name: 'status', type: [String], required: false, enum: ['running', 'in_progress', 'failed'], example: ['running'] })
  @ApiQuery({ name: 'project', type: [String], required: false, example: ['proj_storefront'] })
  @ApiQuery({ name: 'branch', type: [String], required: false, example: ['main'] })
  @ApiQuery({ name: 'trigger', type: [String], required: false, enum: ['git', 'manual', 'redeploy', 'rollback'], example: ['git'] })
  @ApiQuery({ name: 'sort', type: String, required: false, enum: ['created', '-created', 'duration', '-duration'], example: '-created' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', type: Number, required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paged deployment list', type: DeploymentPageDto })
  list(@Query() query: Record<string, string | string[] | undefined>) {
    return this.deployments.list(parseListQuery(query));
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get one deployment' })
  @ApiParam({ name: 'id', type: String, example: 'dep_live' })
  @ApiResponse({ status: 200, description: 'The deployment', type: DeploymentDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  getDeployment(@Param('id') id: string) {
    const deployment = this.deployments.getDeployment(id);
    if (!deployment) throw new NotFoundException('That deployment does not exist.');
    return deployment;
  }

  @Get(':id/logs')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the build log for a deployment' })
  @ApiParam({ name: 'id', type: String, example: 'dep_live' })
  @ApiQuery({ name: 'after', type: Number, required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Build log lines and step states', type: DeploymentLogsDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  getLogs(@Param('id') id: string, @Query('after') after?: string) {
    const deployment = this.deployments.getDeployment(id);
    if (!deployment) throw new NotFoundException('That deployment does not exist.');
    return this.deployments.getLogs(id, Number(after ?? 0));
  }

  @Post(':id/redeploy')
  @HttpCode(201)
  @ApiOperation({ summary: 'Build the same commit again' })
  @ApiParam({ name: 'id', type: String, example: 'dep_live' })
  @ApiResponse({ status: 201, description: 'New deployment (QUEUED)', type: DeploymentDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  redeploy(@Param('id') id: string) {
    return this.deployments.redeploy(id);
  }

  @Post(':id/rollback')
  @HttpCode(201)
  @ApiOperation({ summary: 'Roll back to an earlier deployment by creating a new rollback deployment' })
  @ApiParam({ name: 'id', type: String, example: 'dep_old_1' })
  @ApiResponse({ status: 201, description: 'Rollback result', type: RollbackResultDto })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  @ApiResponse({ status: 409, description: 'No earlier deployment to roll back to' })
  rollback(@Param('id') id: string) {
    return this.deployments.rollback(id);
  }
}

export interface DeploymentListQuery {
  q?: string;
  status?: string[];
  project?: string[];
  branch?: string[];
  trigger?: string[];
  sort?: string;
  page?: string;
  pageSize?: string;
}

export function parseListQuery(
  query: Record<string, string | string[] | undefined>,
): {
  q?: string;
  status?: string[];
  project?: string[];
  branch?: string[];
  trigger?: string[];
  sort?: string;
  page: number;
  pageSize: number;
} {
  const many = (value: string | string[] | undefined): string[] => {
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return Array.isArray(value) ? value : [];
  };
  return {
    q: typeof query.q === 'string' ? query.q : undefined,
    status: many(query.status),
    project: many(query.project),
    branch: many(query.branch),
    trigger: many(query.trigger),
    sort: typeof query.sort === 'string' ? query.sort : undefined,
    page: Number(query.page ?? 1) || 1,
    pageSize: Number(query.pageSize ?? 20) || 20,
  };
}
