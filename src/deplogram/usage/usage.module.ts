import { Global, Module } from '@nestjs/common';

import { UsageController } from './usage.controller.js';
import { UsageService } from './usage.service.js';

@Global()
@Module({
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}
