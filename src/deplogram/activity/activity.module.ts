import { Global, Module } from '@nestjs/common';

import { ActivityController } from './activity.controller.js';

@Global()
@Module({
  controllers: [ActivityController],
})
export class ActivityModule {}
