import { Global, Module } from '@nestjs/common';

import { DeploymentController } from './deployments.controller.js';
import { DeploymentService } from './deployments.service.js';

@Global()
@Module({
  controllers: [DeploymentController],
  providers: [DeploymentService],
})
export class DeploymentsModule {}
