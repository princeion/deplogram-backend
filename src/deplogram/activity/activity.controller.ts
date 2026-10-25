import {
  Controller,
  Get,
  HttpCode,
  Query,
} from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { ActivityFilter, ActivityPage, ActivityType } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ActivityPageDto } from './dto.js';

/**
 * Maps the frontend's activity filter groups to the activity types they include.
 */
const FILTER_TYPES: Record<string, ActivityType[]> = {
  deploys: [
    'deployment.started',
    'deployment.succeeded',
    'deployment.failed',
    'deployment.rolled_back',
  ],
  changes: [
    'project.created',
    'project.renamed',
    'project.deleted',
    'env.updated',
    'settings.updated',
  ],
  failures: ['deployment.failed'],
};

/**
 * The activity timeline — deployments started/succeeded/failed/rolled back,
 * projects created/renamed/deleted, variable and settings changes.
 * Cursor-paginated; events are immutable (the audit log).
 */
@ApiTags('activity')
@Controller('v1/activity')
export class ActivityController {
  constructor(private readonly store: DeplogramStore) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the audit/activity timeline, cursor-paginated' })
  @ApiQuery({ name: 'type', type: String, required: false, enum: ['all', 'deploys', 'changes', 'failures'], example: 'deploys' })
  @ApiQuery({ name: 'project', type: String, required: false, example: 'proj_storefront' })
  @ApiQuery({ name: 'cursor', type: String, required: false, example: 'evt_abc123' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 25 })
  @ApiResponse({ status: 200, description: 'Activity page', type: ActivityPageDto })
  page(
    @Query('type') type: ActivityFilter | undefined,
    @Query('project') project: string | undefined,
    @Query('cursor') cursor: string | null,
    @Query('limit') limit: string | undefined,
  ): ActivityPage {
    const page = this.store.activityPage(cursor ?? null, limit ? Number(limit) : 25);
    let items = page.items;
    if (type && type !== 'all') {
      const allowed = FILTER_TYPES[type] ?? [];
      items = items.filter((event) => allowed.includes(event.type));
    }
    if (project)
      items = items.filter(
        (event) => event.project?.id === project || event.project?.name === project,
      );
    return { items, nextCursor: page.nextCursor };
  }
}
