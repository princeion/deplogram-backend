import {
  Controller,
  Get,
  HttpCode,
} from '@nestjs/common';

import { UsageService } from './usage.service.js';
import type { Usage } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsageDto } from './dto.js';

@ApiTags('usage')
@Controller('v1/usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get plan usage and limits for the current period' })
  @ApiResponse({ status: 200, description: 'Usage data', type: UsageDto })
  current(): Usage {
    return this.usage.current();
  }
}
