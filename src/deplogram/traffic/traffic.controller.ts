import {
  Controller,
  Get,
  HttpCode,
} from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { Traffic, TrafficPoint } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TrafficDto } from './dto.js';

const RECENT_WINDOW_MS = 65 * 1000;

@ApiTags('traffic')
@Controller('v1/traffic')
export class TrafficController {
  constructor(private readonly store: DeplogramStore) {}

  /** Every request of the last ~65 seconds across the live projects. */
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get recent traffic across live projects' })
  // @ts-ignore - isolatedModules + emitDecoratorMetadata; @nestjs/swagger needs the class constructor
  @ApiResponse({ status: 200, description: 'Traffic points', type: TrafficDto })
  current(): Traffic {
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    const requests = this.store
      .getRequests()
      .filter((point) => Date.parse(point.at) >= cutoff)
      .map(toTrafficPoint);
    const liveProjects = this.store.getLiveDeployments().length;
    return { requests, liveProjects };
  }
}

function toTrafficPoint(point: TrafficPoint) {
  return {
    at: point.at,
    projectId: point.projectId,
    error: point.error,
    city: point.city,
    status: point.status,
    latencyMs: point.latencyMs,
    path: point.path,
  };
}
