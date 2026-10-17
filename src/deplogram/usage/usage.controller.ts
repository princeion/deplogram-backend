import { Controller, Get, HttpCode } from '@nestjs/common';

import { UsageService } from './usage.service.js';
import type { Usage } from '../types.js';

/** Plan usage — the current period, its limits and what has been used so far. */
@Controller('v1/usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  @HttpCode(200)
  current(): Usage {
    return this.usage.current();
  }
}
