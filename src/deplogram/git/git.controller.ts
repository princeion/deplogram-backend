import {
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
} from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { GitDetection } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import {
  GitConnectionDto,
  GitRepositoryDto,
  GitBranchDto,
  GitDetectionDto,
} from './dto.js';

/**
 * Simulated Git integration — the frontend uses these to connect a Git account,
 * browse repositories, pick a branch, and detect the runtime before creating a
 * project.
 */
@ApiTags('git')
@Controller('v1/git')
export class GitController {
  constructor(private readonly store: DeplogramStore) {}

  @Get('connection')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the connected Git account' })
  @ApiResponse({ status: 200, description: 'Git connection info', type: GitConnectionDto })
  connection() {
    return this.store.getConnection();
  }

  @Get('repositories')
  @HttpCode(200)
  @ApiOperation({ summary: 'List importable repositories, searchable by name' })
  @ApiQuery({ name: 'q', type: String, required: false, example: 'storefront' })
  @ApiResponse({ status: 200, description: 'Repositories', type: [GitRepositoryDto] })
  repositories(@Query('q') q?: string) {
    return this.store.getRepositories(q);
  }

  @Get('repositories/:repositoryId/branches')
  @HttpCode(200)
  @ApiOperation({ summary: 'List branches with their head commit' })
  @ApiParam({ name: 'repositoryId', type: String, example: 'repo_storefront' })
  @ApiResponse({ status: 200, description: 'Branches', type: [GitBranchDto] })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  branches(@Param('repositoryId') repositoryId: string) {
    return this.store.getBranches(repositoryId);
  }

  @Get('repositories/:repositoryId/detect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Detect the runtime from repository contents' })
  @ApiParam({ name: 'repositoryId', type: String, example: 'repo_storefront' })
  @ApiQuery({ name: 'branch', type: String, required: false, example: 'main' })
  @ApiResponse({ status: 200, description: 'Runtime detection result', type: GitDetectionDto })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  detect(
    @Param('repositoryId') repositoryId: string,
    @Query('branch') branch: string,
  ): GitDetection {
    return this.store.detect(repositoryId, branch);
  }
}
