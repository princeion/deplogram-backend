import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { AccountController } from './account/account.controller.js';
import { ActivityModule } from './activity/activity.module.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { SessionMiddleware } from './auth/session.middleware.js';
import { DeplogramStore } from './store.js';
import { DeploymentController } from './deployments/deployments.controller.js';
import { DeploymentService } from './deployments/deployments.service.js';
import { GitModule } from './git/git.module.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { TrafficController } from './traffic/traffic.controller.js';
import { TrafficService } from './traffic/traffic.service.js';
import { UsageController } from './usage/usage.controller.js';
import { UsageService } from './usage/usage.service.js';
import { WorkspaceController } from './workspace/workspace.controller.js';

/**
 * Everything the web frontend needs under `/v1/*` — the product's API.
 *
 * The controllers of the feature modules live next to their services, and the
 * DeplogramStore is shared by all of them so every feature sees the same
 * records.
 */
@Global()
@Module({
  imports: [ActivityModule, GitModule],
  controllers: [
    AuthController,
    AccountController,
    WorkspaceController,
    TrafficController,
    UsageController,
    ProjectsController,
    DeploymentController,
  ],
  providers: [
    AuthService,
    SessionMiddleware,
    DeploymentService,
    ProjectsService,
    TrafficService,
    UsageService,
    DeplogramStore,
  ],
  exports: [DeplogramStore],
})
export class DeplogramModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
