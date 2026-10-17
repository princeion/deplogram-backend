import { Controller, Get, HttpCode } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { Workspace } from '../types.js';

/** The workspace the signed-in user belongs to. */
@Controller('v1/workspace')
export class WorkspaceController {
  constructor(private readonly store: DeplogramStore) {}

  @Get()
  @HttpCode(200)
  current(): Workspace {
    return this.store.currentWorkspace();
  }
}
