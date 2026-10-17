import { Controller, Get, HttpCode } from '@nestjs/common';

import { TrafficService } from './traffic.service.js';
import type { Traffic } from '../types.js';

/** Live traffic of the whole workspace — the Overview's live signal. */
@Controller('v1/traffic')
export class TrafficController {
  constructor(private readonly traffic: TrafficService) {}

  @Get()
  @HttpCode(200)
  live(): Traffic {
    return this.traffic.current();
  }
}
