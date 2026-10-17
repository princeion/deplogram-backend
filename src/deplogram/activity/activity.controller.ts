import { Controller, Get, HttpCode, Query } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { ActivityFilter, ActivityPage } from '../types.js';

/**
 * The activity timeline — deployments started/succeeded/failed/rolled back,
 * projects created/renamed/deleted, variable and settings changes.
 * Cursor-paginated; events are immutable (the audit log).
 */
@Controller('v1/activity')
export class ActivityController {
  constructor(private readonly store: DeplogramStore) {}

  @Get()
  @HttpCode(200)
  page(
    @Query('type') type: ActivityFilter | undefined,
    @Query('project') project: string | undefined,
    @Query('cursor') cursor: string | null,
    @Query('limit') limit: string | undefined,
  ): ActivityPage {
    return this.store.activityPage(cursor ?? null, limit ? Number(limit) : 25);
  }
}
