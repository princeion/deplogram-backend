import { Controller, Get, HttpCode } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { Workspace } from '../types.js';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkspaceDto } from './dto.js';

/** The workspace the signed-in user belongs to. */
@ApiTags('workspace')
@Controller('v1/workspace')
export class WorkspaceController {
  constructor(private readonly store: DeplogramStore) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the current workspace' })
  @ApiResponse({ status: 200, description: 'Workspace', type: WorkspaceDto })
  current(): Workspace {
    return this.store.currentWorkspace();
  }
}
