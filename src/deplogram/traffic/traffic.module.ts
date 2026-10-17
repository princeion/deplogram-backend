import { Global, Module } from '@nestjs/common';

import { TrafficController } from './traffic.controller.js';
import { TrafficService } from './traffic.service.js';

@Global()
@Module({
  controllers: [TrafficController],
  providers: [TrafficService],
})
export class TrafficModule {}
