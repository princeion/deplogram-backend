import { Controller, Get, HttpCode, Param, Query } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { GitDetection } from '../types.js';

/**
 * Simulated Git integration — the frontend uses these to connect a Git account,
 * browse repositories, pick a branch, and detect the runtime before creating a
 * project.
 */
@Controller('v1/git')
export class GitController {
  constructor(private readonly store: DeplogramStore) {}

  @Get('connection')
  @HttpCode(200)
  connection() {
    return this.store.getConnection();
  }

  @Get('repositories')
  @HttpCode(200)
  repositories(@Query('q') q?: string) {
    return this.store.getRepositories(q);
  }

  @Get('repositories/:repositoryId/branches')
  @HttpCode(200)
  branches(@Param('repositoryId') repositoryId: string) {
    return this.store.getBranches(repositoryId);
  }

  @Get('repositories/:repositoryId/detect')
  @HttpCode(200)
  detect(
    @Param('repositoryId') repositoryId: string,
    @Query('branch') branch: string,
  ): GitDetection {
    return this.store.detect(repositoryId, branch);
  }
}
