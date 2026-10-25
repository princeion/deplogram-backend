import { ConflictException, Injectable } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import { DeploymentService } from '../deployments/deployments.service.js';
import {
  Deployment,
  DeploymentState,
  EnvVarRecord,
  Metrics,
  MetricsRange,
  Project,
  ProjectSummary,
  ProjectUpdate,
  RuntimeLogs,
} from '../types.js';

const METRICS_RANGES: readonly MetricsRange[] = ['1h', '24h', '7d'];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly store: DeplogramStore,
    private readonly deployments: DeploymentService,
  ) {}

  // ── projects ─────────────────────────────────────────────────────────────────

  listProjects(): ProjectSummary[] {
    const summaries: ProjectSummary[] = [];
    for (const project of this.store.listProjects()) {
      summaries.push(this.summarize(project, false));
    }
    return summaries;
  }

  getProject(id: string): Project | undefined {
    const project = this.store.getProject(id);
    return project ? (this.summarize(project, true) as Project) : undefined;
  }

  createProject(input: {
    name: string;
    repositoryId: string;
    branch: string;
    runtime: string;
    config: {
      buildCommand: string | null;
      startCommand: string | null;
      port: number | null;
      rootDirectory: string | null;
    };
    env: { key: string; value: string }[];
  }): { project: ProjectSummary; deployment: Deployment } {
    for (const existing of this.store.listProjects()) {
      if (existing.name === input.name) {
        throw new ConflictException('That project name is already taken.');
      }
    }
    const project = this.store.createProject(input);
    const deployment = this.store.createDeployment(project.id, {
      trigger: 'git',
      commitSha: randomSha(),
      commitMessage: `deploy ${project.name}`,
      author: { name: 'Ada Lovelace', avatarUrl: null },
    });
    this.deployments.startBuild(deployment.id);
    return { project: this.summarize(project, false), deployment };
  }

  updateProject(id: string, update: ProjectUpdate): Project | undefined {
    const project = this.store.updateProject(id, {
      name: update.name,
      branch: update.branch,
      config: update.config,
    });
    return project ? (this.summarize(project, true) as Project) : undefined;
  }

  deleteProject(id: string): void {
    this.store.deleteProject(id);
  }

  /** Is the name (and therefore the URL) still free? */
  checkNameAvailability(name: string): {
    available: boolean;
    url: string;
    suggestion: string | null;
  } {
    for (const project of this.store.listProjects()) {
      if (project.name === name) {
        return {
          available: false,
          url: this.store.urlOf(name),
          suggestion: null,
        };
      }
    }
    return { available: true, url: this.store.urlOf(name), suggestion: null };
  }

  // ── environment variables ────────────────────────────────────────────────────

  getEnvVars(id: string): EnvVarRecord[] {
    return this.store.getEnvVars(id);
  }

  saveEnvVars(
    id: string,
    values: { key: string; value: string | null }[],
  ): EnvVarRecord[] {
    return this.store.saveEnvVars(id, values);
  }

  // ── runtime logs ─────────────────────────────────────────────────────────────

  getRuntimeLogs(projectId: string, after: number): RuntimeLogs {
    const project = this.store.getProject(projectId);
    if (!project) throw new Error('Unknown project');
    const deployment =
      this.liveDeploymentOf(projectId) ?? this.latestDeploymentOf(projectId);
    const { lines } = this.store.getRuntimeLog(deployment.id, after);
    return { lines, live: deployment.live };
  }

  // ── metrics ──────────────────────────────────────────────────────────────────

  getMetrics(projectId: string, range: string): Metrics {
    const project = this.store.getProject(projectId);
    if (!project) throw new Error('Unknown project');
    const metricsRange: MetricsRange = METRICS_RANGES.includes(
      range as MetricsRange,
    )
      ? (range as MetricsRange)
      : '24h';
    const start = startOfRange(metricsRange);
    const periodRequests = this.store
      .getRequests()
      .filter(
        (point) =>
          Date.parse(point.at) >= start && Date.parse(point.at) < Date.now(),
      );

    const { summary, series, statuses, paths, memoryLimit } = this.aggregate(
      periodRequests,
      metricsRange,
    );
    return {
      range: metricsRange,
      summary,
      series,
      statuses,
      paths,
      memoryLimit,
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private summarize(
    project: Project,
    withConfig: boolean,
  ): ProjectSummary | Project {
    const deployments = this.store.deploymentsOfProject(project.id);
    const latest = deployments[0];
    const state: DeploymentState = latest ? latest.state : 'QUEUED';
    const url =
      state === 'RUNNING' && latest ? this.store.urlOf(project.name) : null;
    const summary: ProjectSummary = {
      id: project.id,
      name: project.name,
      runtime: project.runtime,
      state,
      url,
      repository: project.repository,
      branch: project.branch,
      updatedAt: project.updatedAt,
      latest: latest
        ? {
            id: latest.id,
            state: latest.state,
            live: latest.live,
            sha: latest.commit.sha,
            message: latest.commit.message,
            createdAt: latest.createdAt,
          }
        : null,
      recent: deployments.slice(0, 10).map((deployment) => deployment.state),
    };
    if (!withConfig) return summary;
    return {
      ...summary,
      createdAt: project.createdAt,
      liveDeploymentId: project.liveDeploymentId,
      envCount: project.env.length,
      config: project.config,
      env: project.env,
    };
  }

  private liveDeploymentOf(projectId: string) {
    const deployments = this.store.deploymentsOfProject(projectId);
    return deployments.find((deployment) => deployment.live);
  }

  private latestDeploymentOf(projectId: string) {
    const deployments = this.store.deploymentsOfProject(projectId);
    return deployments[0];
  }

  private aggregate(
    requests: import('../types.js').TrafficPoint[],
    range: MetricsRange,
  ) {
    const start = startOfRange(range);
    const bucketSize = bucketSizeOf(range);
    const bucketCount = bucketsOf(range);

    const series = [];
    const latenciesPerBucket: number[][] = [];
    for (let index = 0; index < bucketCount; index += 1) {
      const bucketStart = start + index * bucketSize;
      series.push({
        t: new Date(bucketStart).toISOString(),
        requests: 0,
        errors: 0,
        p50: 0,
        p95: 0,
        cpu: 0,
        memory: 0,
      });
      latenciesPerBucket.push([]);
    }

    let ok = 0;
    let redirect = 0;
    let clientError = 0;
    let serverError = 0;
    const latencies: number[] = [];
    const perPath = new Map<string, { requests: number; p95sum: number[] }>();
    for (const request of requests) {
      const at = new Date(request.at).getTime();
      const index = Math.min(
        Math.floor((at - start) / bucketSize),
        bucketCount - 1,
      );
      const point = series[index];
      point.requests += 1;
      if (request.error) {
        point.errors += 1;
        serverError += 1;
      } else {
        ok += 1;
      }
      latencies.push(request.latencyMs);
      latenciesPerBucket[index].push(request.latencyMs);
      const entry = perPath.get(request.path) ?? { requests: 0, p95sum: [] };
      entry.requests += 1;
      entry.p95sum.push(request.latencyMs);
      perPath.set(request.path, entry);
      if (request.status >= 300 && request.status < 400) redirect += 1;
      else if (request.status >= 400 && request.status < 500) clientError += 1;
      else if (request.status >= 500) serverError += 1;
    }
    for (let index = 0; index < series.length; index += 1) {
      const latencies = latenciesPerBucket[index];
      series[index].p50 = percentile(latencies, 50);
      series[index].p95 = percentile(latencies, 95);
    }

    const paths = [...perPath.entries()]
      .map(([path, entry]) => ({
        path,
        requests: entry.requests,
        p95: percentile(entry.p95sum, 95),
      }))
      .sort((a, b) => b.requests - a.requests);

    const total = series.reduce((sum, point) => sum + point.requests, 0);

    return {
      summary: {
        requests: total,
        errorRate: total === 0 ? 0 : (total - ok) / total,
        p95: percentile(latencies, 95),
        uptime: total === 0 ? 1 : ok / total,
      },
      series,
      statuses: { ok, redirect, clientError, serverError },
      paths,
      memoryLimit: 512,
    };
  }
}

function bucketsOf(range: MetricsRange): number {
  return range === '1h' ? 12 : range === '24h' ? 24 : 28;
}

function bucketSizeOf(range: MetricsRange): number {
  return range === '1h'
    ? 5 * 60 * 1000
    : range === '24h'
      ? 60 * 60 * 1000
      : 6 * 60 * 60 * 1000;
}

function startOfRange(range: MetricsRange): number {
  const milliseconds =
    range === '1h'
      ? 60 * 60 * 1000
      : range === '24h'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  return Date.now() - milliseconds;
}

function percentile(values: number[], percent: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    Math.floor((percent / 100) * sorted.length),
    sorted.length - 1,
  );
  return sorted[index];
}

function randomSha(): string {
  return Math.random().toString(16).slice(2, 10).padEnd(10, '0');
}
