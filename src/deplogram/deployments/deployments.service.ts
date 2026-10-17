import { ConflictException, Injectable } from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import {
  BuildStep,
  BuildStepId,
  BuildStepState,
  Deployment,
  DeploymentState,
  DeploymentLogs,
} from '../types.js';

/** Lifecycle states that are still in progress — anything else is a finished (failed) deployment. */
const IN_PROGRESS_STATES: readonly DeploymentState[] = [
  'QUEUED',
  'BUILDING',
  'BUILT',
  'DEPLOYING',
];

const STATUS_GROUPS: Record<string, readonly DeploymentState[]> = {
  running: ['RUNNING'],
  in_progress: ['QUEUED', 'BUILDING', 'BUILT', 'DEPLOYING'],
  failed: ['BUILD_FAILED', 'DEPLOY_FAILED', 'CRASHED'],
};

const STEP_LABELS: Record<BuildStepId, string> = {
  clone: 'Clone the repository',
  install: 'Install dependencies',
  build: 'Build the project',
  deploy: 'Deploy',
  runtime: 'Start the runtime',
};

@Injectable()
export class DeploymentService {
  constructor(private readonly store: DeplogramStore) {}

  /** The state of every build step, keyed by deployment — the build-log UI. */
  private readonly builds = new Map<string, BuildStep[]>();

  // ── list ─────────────────────────────────────────────────────────────────────

  list(params: {
    q?: string;
    status?: string[];
    project?: string[];
    branch?: string[];
    trigger?: string[];
    sort?: string;
    page: number;
    pageSize: number;
  }): { items: Deployment[]; total: number; page: number; pageSize: number } {
    const statusGroups = params.status ?? [];
    const deployments = [...this.store.allDeployments()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    const filtered = deployments.filter((deployment) => {
      for (const group of statusGroups) {
        const states = STATUS_GROUPS[group];
        if (states && states.includes(deployment.state)) return true;
      }
      if (
        params.project?.length &&
        !params.project.includes(deployment.projectId)
      )
        return false;
      if (
        params.branch?.length &&
        !params.branch.includes(deployment.commit.branch)
      )
        return false;
      if (
        params.trigger?.length &&
        !params.trigger.includes(deployment.trigger)
      )
        return false;
      if (params.q && !this.matchesQuery(deployment, params.q)) return false;
      return true;
    });

    const sorted = this.sort(filtered, params.sort);
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      pageSize,
    };
  }

  // ── detail ───────────────────────────────────────────────────────────────────

  getDeployment(id: string): Deployment {
    const deployment = this.store.getDeployment(id);
    if (!deployment) throw new Error('Unknown deployment');
    return deployment;
  }

  // ── logs ─────────────────────────────────────────────────────────────────────

  getLogs(id: string, after: number): DeploymentLogs {
    const deployment = this.store.getDeployment(id);
    if (!deployment) throw new Error('Unknown deployment');
    const { lines } = this.store.getBuildLog(id, after);
    return {
      lines,
      steps: this.buildsFor(id),
      done: !IN_PROGRESS_STATES.includes(deployment.state),
    };
  }

  // ── actions ──────────────────────────────────────────────────────────────────

  /** Builds the same commit again — used by "Redeploy" on a finished deployment. */
  redeploy(id: string): Deployment {
    const deployment = this.store.getDeployment(id);
    if (!deployment) throw new Error('Unknown deployment');
    const fresh = this.store.createDeployment(deployment.projectId, {
      trigger: 'redeploy',
      commitSha: deployment.commit.sha,
      commitMessage: deployment.commit.message,
      author: deployment.commit.author,
    });
    this.startBuild(fresh.id);
    return fresh;
  }

  /**
   * Makes the earlier deployment that was live before `id` live again — used by
   * "Rollback". `id` is the deployment being rolled back.
   */
  rollback(id: string): {
    deployment: Deployment;
    previousLiveId: string | null;
  } {
    const current = this.store.getDeployment(id);
    if (!current) throw new Error('Unknown deployment');
    const targetId = current.previousLiveId;
    if (!targetId)
      throw new ConflictException('No earlier deployment to roll back to');
    const promoted = this.store.rollbackTo(current.projectId, id);
    if (!promoted)
      throw new ConflictException('No earlier deployment to roll back to');
    return { deployment: current, previousLiveId: targetId };
  }

  // ── build simulation ─────────────────────────────────────────────────────────

  /** The current state of every build step, for the build-log UI. */
  private buildsFor(deploymentId: string): BuildStep[] {
    return this.builds.get(deploymentId) ?? [];
  }

  /**
   * The build a newly created deployment goes through, played out by timers so
   * the frontend can watch QUEUED → BUILDING → RUNNING happen. Clears itself once
   * the deployment reaches a final state, so shutdown is never blocked.
   */
  private startBuild(deploymentId: string): void {
    const deployment = this.store.getDeployment(deploymentId);
    if (!deployment) return;
    this.builds.set(deploymentId, []);
    const steps: BuildStepId[] = [
      'clone',
      'install',
      'build',
      'deploy',
      'runtime',
    ];
    let stepIndex = 0;
    const runNext = () => {
      const step = steps[stepIndex];
      if (!step) {
        this.finishBuild(deploymentId, 'RUNNING');
        return;
      }
      stepIndex += 1;
      this.setStep(deploymentId, step, 'running');
      const delay = step === 'runtime' ? 400 : 900;
      setTimeout(() => {
        if (step === 'build') {
          const failed = Math.random() < 0.15;
          if (failed) {
            this.failBuild(deploymentId, 'BUILD_FAILED');
            return;
          }
        }
        if (step === 'deploy') {
          const failed = Math.random() < 0.1;
          if (failed) {
            this.failBuild(deploymentId, 'DEPLOY_FAILED');
            return;
          }
        }
        this.setStep(deploymentId, step, 'succeeded');
        runNext();
      }, delay);
    };
    runNext();
  }

  private setStep(
    deploymentId: string,
    step: BuildStepId,
    state: BuildStepState,
  ): void {
    const steps = this.builds.get(deploymentId) ?? [];
    const existing = steps.find((candidate) => candidate.id === step);
    if (existing) {
      existing.state = state;
      existing.endedAt = new Date().toISOString();
    } else {
      steps.push({
        id: step,
        label: STEP_LABELS[step],
        state,
        startedAt: new Date().toISOString(),
        endedAt: state === 'succeeded' ? new Date().toISOString() : null,
      });
    }
    this.builds.set(deploymentId, steps);
  }

  private failBuild(
    deploymentId: string,
    state: 'BUILD_FAILED' | 'DEPLOY_FAILED' | 'CRASHED',
  ): void {
    const steps = this.builds.get(deploymentId) ?? [];
    for (const step of steps) {
      if (step.state === 'running' || step.state === 'pending')
        step.state = 'failed';
    }
    const deployment = this.store.getDeployment(deploymentId);
    if (!deployment) return;
    deployment.state = state;
    this.store.finishDeployment(deploymentId, state);
    this.builds.delete(deploymentId);
  }

  private finishBuild(deploymentId: string, state: 'RUNNING'): void {
    const deployment = this.store.getDeployment(deploymentId);
    if (!deployment) return;
    deployment.state = state;
    this.store.finishDeployment(deploymentId, state);
    this.builds.delete(deploymentId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private sort(
    deployments: Deployment[],
    sort: string | undefined,
  ): Deployment[] {
    const copy = [...deployments];
    switch (sort) {
      case 'created':
      case '-created':
        return copy.sort((a, b) => compareCreated(a, b, sort === '-created'));
      case 'duration':
      case '-duration':
        return copy.sort((a, b) => compareDuration(a, b, sort === '-duration'));
      default:
        return copy.sort((a, b) => compareCreated(a, b, false));
    }
  }

  private matchesQuery(deployment: Deployment, query: string): boolean {
    const needle = query.toLowerCase();
    return (
      deployment.projectName.toLowerCase().includes(needle) ||
      deployment.commit.message.toLowerCase().includes(needle) ||
      deployment.commit.sha.includes(needle)
    );
  }
}

function compareCreated(
  a: Deployment,
  b: Deployment,
  oldestFirst: boolean,
): number {
  const result = a.createdAt < b.createdAt ? 1 : -1;
  return oldestFirst ? -result : result;
}

function compareDuration(
  a: Deployment,
  b: Deployment,
  shortestFirst: boolean,
): number {
  const aDuration = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  const bDuration = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  const result = aDuration - bDuration;
  return shortestFirst ? result : -result;
}
