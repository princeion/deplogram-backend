import { Global, Module } from '@nestjs/common';

import { WorkspaceController } from './workspace.controller.js';

@Global()
@Module({
  controllers: [WorkspaceController],
})
export class WorkspaceModule {}
