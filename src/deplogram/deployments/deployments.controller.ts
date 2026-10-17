import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';

import { DeploymentService } from './deployments.service.js';

/**
 * Deployments: the list, one deployment, its build log, and the actions that
 * create or undo deployments.
 */
@Controller('v1/deployments')
export class DeploymentController {
  constructor(private readonly deployments: DeploymentService) {}

  @Get()
  @HttpCode(200)
  list(@Query() query: Record<string, string | string[] | undefined>) {
    return this.deployments.list(parseListQuery(query));
  }

  @Get(':id')
  @HttpCode(200)
  getDeployment(@Param('id') id: string) {
    const deployment = this.deployments.getDeployment(id);
    if (!deployment) throw new Error('Unknown deployment');
    return deployment;
  }

  @Get(':id/logs')
  @HttpCode(200)
  getLogs(@Param('id') id: string, @Query('after') after?: string) {
    return this.deployments.getLogs(id, Number(after ?? 0));
  }

  @Post(':id/redeploy')
  @HttpCode(201)
  redeploy(@Param('id') id: string) {
    return this.deployments.redeploy(id);
  }

  @Post(':id/rollback')
  @HttpCode(201)
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
  const many = (value: string | string[] | undefined): string[] =>
    typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
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
