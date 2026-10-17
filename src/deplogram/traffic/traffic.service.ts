import { Injectable } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import { Traffic, TrafficPoint } from '../types.js';

const RECENT_WINDOW_MS = 65 * 1000;

@Injectable()
export class TrafficService {
  constructor(private readonly store: DeplogramStore) {}

  /** Every request of the last ~65 seconds across the live projects. */
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
