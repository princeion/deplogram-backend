import { Injectable } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import { Plan, Usage, UsageLimit, UsageLimitId } from '../types.js';

/** Hard limits per plan — the frontend shows them as "used / limit". */
const LIMITS_PER_PLAN: Record<Plan, Omit<UsageLimit, 'used' | 'unit'>[]> = {
  free: [
    { id: 'active_deployments', label: 'Active deployments', limit: 1 },
    { id: 'build_minutes', label: 'Build minutes', limit: 120 },
    { id: 'bandwidth', label: 'Bandwidth', limit: 500 * 1024 * 1024 },
    { id: 'storage', label: 'Storage', limit: 256 * 1024 * 1024 },
  ],
  plus: [
    { id: 'active_deployments', label: 'Active deployments', limit: 5 },
    { id: 'build_minutes', label: 'Build minutes', limit: 1000 },
    { id: 'bandwidth', label: 'Bandwidth', limit: 5 * 1024 * 1024 * 1024 },
    { id: 'storage', label: 'Storage', limit: 2 * 1024 * 1024 * 1024 },
  ],
  pro: [
    { id: 'active_deployments', label: 'Active deployments', limit: 20 },
    { id: 'build_minutes', label: 'Build minutes', limit: 5000 },
    { id: 'bandwidth', label: 'Bandwidth', limit: 50 * 1024 * 1024 * 1024 },
    { id: 'storage', label: 'Storage', limit: 20 * 1024 * 1024 * 1024 },
  ],
  enterprise: [
    { id: 'active_deployments', label: 'Active deployments', limit: 100 },
    { id: 'build_minutes', label: 'Build minutes', limit: 20000 },
    { id: 'bandwidth', label: 'Bandwidth', limit: 500 * 1024 * 1024 * 1024 },
    { id: 'storage', label: 'Storage', limit: 100 * 1024 * 1024 * 1024 },
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Requests by weekday (Mon first) and hour of day, UTC — 7 rows × 24 columns. */
function trafficByHour(
  points: import('../types.js').TrafficPoint[],
): number[][] {
  const rows: number[][] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      row.push(0);
    }
    rows.push(row);
  }
  for (const point of points) {
    const date = new Date(point.at);
    const weekday = (date.getUTCDay() + 6) % 7; // Monday first
    rows[weekday][date.getUTCHours()] += 1;
  }
  return rows;
}

@Injectable()
export class UsageService {
  constructor(private readonly store: DeplogramStore) {}

  current(): Usage {
    const plan = this.store.currentWorkspace().plan;
    const limits = LIMITS_PER_PLAN[plan].map((limit) => {
      const used = this.used(limit.id, periodStart(), periodEnd());
      return { ...limit, used, unit: unitFor(limit.id) };
    });

    const today = new Date();
    const requests: Usage['requests'] = [];
    for (let day = 29; day >= 0; day -= 1) {
      const dayStart = today.getTime() - day * DAY_MS;
      requests.push({
        date: new Date(dayStart).toISOString().slice(0, 10),
        requests: this.countRequests(dayStart, dayStart + DAY_MS),
        previous: this.countRequests(
          shiftMonths(dayStart, -1),
          dayStart + DAY_MS,
        ),
      });
    }

    const builds: Usage['builds'] = [];
    for (let day = 29; day >= 0; day -= 1) {
      const dayStart = today.getTime() - day * DAY_MS;
      builds.push({
        date: new Date(dayStart).toISOString().slice(0, 10),
        succeeded: 0,
        failed: 0,
      });
    }
    for (const deployment of this.store.allDeployments()) {
      const index = builds.findIndex(
        (entry) => entry.date === deployment.createdAt.slice(0, 10),
      );
      if (index < 0) continue;
      if (isFailed(deployment.state)) builds[index].failed += 1;
      else builds[index].succeeded += 1;
    }

    const end = periodEnd();
    const start = periodStart();
    const requestsPeriod = this.store
      .getRequests()
      .filter(
        (point) => Date.parse(point.at) >= start && Date.parse(point.at) < end,
      );
    let served = 0;
    for (const point of requestsPeriod) {
      if (!point.error) served += 1;
    }

    const byHour = trafficByHour(this.store.getRequests());

    return {
      period: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      },
      limits,
      requests,
      builds,
      bandwidthByProject: this.bandwidthByProject(start, end),
      storageByKind: [
        { kind: 'container', bytes: 128 * 1024 * 1024 },
        { kind: 'static', bytes: 64 * 1024 * 1024 },
      ],
      trafficByHour: byHour,
      uptime: requestsPeriod.length === 0 ? 1 : served / requestsPeriod.length,
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private used(limitId: UsageLimitId, start: number, end: number): number {
    switch (limitId) {
      case 'active_deployments': {
        return this.store.getLiveDeployments().length;
      }
      case 'build_minutes': {
        let minutes = 0;
        for (const deployment of this.store.allDeployments()) {
          const created = Date.parse(deployment.createdAt);
          if (created >= start && created < end && deployment.durationSeconds) {
            minutes += deployment.durationSeconds / 60;
          }
        }
        return Math.round(minutes);
      }
      case 'bandwidth': {
        let megabytes = 0;
        for (const point of this.store.getRequests()) {
          const at = Date.parse(point.at);
          if (at >= start && at < end) megabytes += 1;
        }
        return megabytes;
      }
      case 'storage': {
        let megabytes = 0;
        for (const project of this.store.listProjects()) {
          megabytes += project.env.length;
        }
        return megabytes;
      }
    }
  }

  private countRequests(start: number, end: number): number {
    let count = 0;
    for (const point of this.store.getRequests()) {
      const at = Date.parse(point.at);
      if (at >= start && at < end) count += 1;
    }
    return count;
  }

  private bandwidthByProject(
    start: number,
    end: number,
  ): Usage['bandwidthByProject'] {
    const perProject = new Map<string, { name: string; bytes: number }>();
    for (const point of this.store.getRequests()) {
      const at = Date.parse(point.at);
      if (at < start || at >= end) continue;
      const project = this.store.getProject(point.projectId);
      if (!project) continue;
      const entry = perProject.get(project.id) ?? {
        name: project.name,
        bytes: 0,
      };
      entry.bytes += 1024 * 1024;
      perProject.set(project.id, entry);
    }
    return [...perProject.entries()]
      .map(([projectId, entry]) => ({
        projectId,
        name: entry.name,
        bytes: entry.bytes,
      }))
      .sort((a, b) => b.bytes - a.bytes);
  }
}

function isFailed(state: string): boolean {
  return (
    state === 'BUILD_FAILED' || state === 'DEPLOY_FAILED' || state === 'CRASHED'
  );
}

function periodStart(): number {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function periodEnd(): number {
  return Date.now();
}

function unitFor(limitId: UsageLimitId): UsageLimit['unit'] {
  if (limitId === 'build_minutes') return 'minutes';
  if (limitId === 'bandwidth' || limitId === 'storage') return 'bytes';
  return 'count';
}

/** The same day of the previous month — what `previous` compares against. */
function shiftMonths(dayStart: number, months: number): number {
  const date = new Date(dayStart);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return target.getTime();
}
