/**
 * The Deplogram database — an in-memory store, seeded on boot.
 *
 * The web frontend talks to these modules over HTTP; nothing here touches the
 * network. Keeping the store in one place lets every feature read and write the
 * same records (projects, deployments, the activity log, the access log…) without
 * pulling in a database dependency.
 */
import { Injectable } from '@nestjs/common';

import {
  AccountPreferences,
  AccountSettings,
  ActivityEvent,
  ActivityPage,
  ActivityType,
  BuildLogLine,
  BuildStepId,
  Deployment,
  DeploymentState,
  DeploymentTrigger,
  EnvVarRecord,
  GitBranch,
  GitConnection,
  GitDetection,
  GitRepository,
  Project,
  ProjectEnvVar,
  RuntimeLogLevel,
  RuntimeLogSource,
  RuntimeLogLine,
  TrafficPoint,
  User,
  Viewer,
  Workspace,
} from './types.js';

const MAX_REQUEST_LOG = 5000;
const MAX_ACTIVITY_LOG = 500;

function isoNow(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** The subset of a project's configuration a caller may change. */
interface ProjectConfigInput {
  buildCommand: string | null;
  startCommand: string | null;
  port: number | null;
  rootDirectory: string | null;
}

@Injectable()
export class DeplogramStore {
  readonly users = new Map<string, User>();
  readonly workspaces = new Map<string, Workspace>();
  readonly projects = new Map<string, Project>();
  readonly deployments = new Map<string, Deployment>();
  readonly repositories = new Map<string, GitRepository>();
  readonly branches = new Map<string, GitBranch[]>();
  readonly activity = new Map<string, ActivityEvent>();
  /** Most recent activity first. */
  readonly activityOrder: ActivityEvent[] = [];
  /** Access log — powers `/v1/traffic` and `/v1/projects/:id/metrics`. */
  readonly requests: TrafficPoint[] = [];
  /** Variables per user, keyed like the account settings they configure. */
  private readonly preferences = new Map<string, AccountPreferences>();
  /** Session token → user id. Powers cookie-based sign-in. */
  readonly sessions = new Map<string, string>();

  currentUser: User | null = null;
  connectedAccount: string | null = null;

  constructor() {
    this.seed();
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  seed(): void {
    const now = Date.now();

    // A demo account, so the sign-in flow has something to log in with.
    const owner: User = {
      id: 'user_owner',
      email: 'owner@deplogram.app',
      name: 'Sam Rivera',
      image: null,
      password: 'password',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 90).toISOString(),
    };
    this.users.set(owner.id, owner);
    this.currentUser = owner;

    this.workspaces.set('ws_personal', {
      id: 'ws_personal',
      name: 'Personal Galley',
      kind: 'personal',
      plan: 'free',
    });

    // Git: the connected account and the importable repositories.
    this.connectedAccount = 'princeion';
    const storefrontRepository: GitRepository = {
      id: 'repo_storefront',
      fullName: 'acme/storefront',
      private: false,
      defaultBranch: 'main',
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 21).toISOString(),
      projectId: null,
    };
    const apiRepository: GitRepository = {
      id: 'repo_api',
      fullName: 'acme/api',
      private: true,
      defaultBranch: 'main',
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
      projectId: null,
    };
    this.repositories.set(storefrontRepository.id, storefrontRepository);
    this.repositories.set(apiRepository.id, apiRepository);
    this.branches.set(storefrontRepository.id, [
      {
        name: 'main',
        commit: { sha: 'a1b2c3d', message: 'feat: live traffic dashboard' },
      },
      {
        name: 'feature/logs',
        commit: { sha: 'b2c3d4e', message: 'feat: runtime logs' },
      },
    ]);
    this.branches.set(apiRepository.id, [
      {
        name: 'main',
        commit: { sha: '5d4c3b2', message: 'feat: usage endpoints' },
      },
    ]);

    // Projects — the running one keeps the dashboard alive.
    const storefrontProject = this.createProject(
      {
        name: 'storefront',
        repositoryId: storefrontRepository.id,
        branch: storefrontRepository.defaultBranch,
        runtime: 'nextjs',
        config: {
          buildCommand: null,
          startCommand: null,
          port: null,
          rootDirectory: null,
        },
        env: [],
      },
      'proj_storefront',
    );
    storefrontRepository.projectId = storefrontProject.id;
    const apiProject = this.createProject(
      {
        name: 'api',
        repositoryId: apiRepository.id,
        branch: apiRepository.defaultBranch,
        runtime: 'node',
        config: {
          buildCommand: null,
          startCommand: null,
          port: null,
          rootDirectory: null,
        },
        env: [],
      },
      'proj_api',
    );
    apiRepository.projectId = apiProject.id;
    this.createProject(
      {
        name: 'docs',
        repositoryId: storefrontRepository.id,
        branch: 'gh-pages',
        runtime: 'static',
        config: {
          buildCommand: null,
          startCommand: null,
          port: null,
          rootDirectory: null,
        },
        env: [],
      },
      'proj_docs',
    );

    // Deployments of the storefront, oldest first — the last one is what a rollback rolls
    // forward to (`previousLiveId` of the live deployment).
    const olderStillLive = this.createDeployment(
      storefrontProject.id,
      {
        trigger: 'git',
        commitSha: '6e5d4c3',
        commitMessage: 'chore: initial commit',
        author: { name: 'Ada Lovelace', avatarUrl: null },
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      },
      'dep_old_2',
    );
    this.markLive(storefrontProject.id, olderStillLive.id);
    this.appendBuildLog(olderStillLive.id, [
      ['clone', 'stdout', 'Cloning into "storefront"…'],
      ['build', 'stdout', 'no build needed'],
    ]);

    const older = this.createDeployment(
      storefrontProject.id,
      {
        trigger: 'git',
        commitSha: '8f7e6d5',
        commitMessage: 'feat: cart',
        author: { name: 'Ada Lovelace', avatarUrl: null },
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      'dep_old_1',
    );
    this.markLive(storefrontProject.id, older.id);
    this.appendBuildLog(older.id, [
      ['clone', 'stdout', 'Cloning into "storefront"…'],
      ['install', 'stdout', 'added 400 packages in 8s'],
      ['build', 'stdout', '✓ built in 3s'],
      ['deploy', 'stdout', 'Deployment ready'],
    ]);

    const live = this.createDeployment(
      storefrontProject.id,
      {
        trigger: 'git',
        commitSha: 'a1b2c3d',
        commitMessage: 'feat: live traffic dashboard',
        author: { name: 'Ada Lovelace', avatarUrl: null },
        createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      },
      'dep_live',
    );
    this.markLive(storefrontProject.id, live.id);
    this.appendBuildLog(live.id, [
      ['clone', 'stdout', 'Cloning into "storefront"…'],
      ['install', 'stdout', 'added 412 packages in 9s'],
      ['build', 'stdout', '✓ built in 4s'],
      ['deploy', 'stdout', 'Deployment ready'],
    ]);
    this.appendRuntimeLog(live.id, [
      ['info', 'app', 'listening on http://localhost:3000'],
    ]);

    // The api service runs too, so the workspace has more than one live project.
    const apiDeployment = this.createDeployment(
      apiProject.id,
      {
        trigger: 'git',
        commitSha: '5d4c3b2',
        commitMessage: 'feat: usage endpoints',
        author: { name: 'Grace Hopper', avatarUrl: null },
        createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      },
      'dep_api_live',
    );
    this.markLive(apiProject.id, apiDeployment.id);
    this.appendBuildLog(apiDeployment.id, [
      ['clone', 'stdout', 'Cloning into "api"…'],
      ['install', 'stdout', 'added 120 packages in 6s'],
      ['build', 'stdout', '✓ built in 2s'],
      ['deploy', 'stdout', 'Deployment ready'],
    ]);
    this.appendRuntimeLog(apiDeployment.id, [
      ['info', 'app', 'listening on http://localhost:8080'],
    ]);

    this.recordActivity(
      owner,
      'project.created',
      'storefront',
      'proj_storefront',
      null,
      'connected repository',
    );
    this.recordActivity(
      owner,
      'deployment.started',
      'storefront',
      'proj_storefront',
      'dep_live',
      null,
    );
    this.recordActivity(
      owner,
      'env.updated',
      'storefront',
      'proj_storefront',
      null,
      'added SENTRY_DSN',
    );
  }

  // ── workspace ────────────────────────────────────────────────────────────────

  currentWorkspace() {
    const workspace = this.workspaces.get('ws_personal');
    if (!workspace) throw new Error('No current workspace');
    return workspace;
  }

  // ── users, session and account ───────────────────────────────────────────────

  findUserByEmail(email: string): User | undefined {
    const needle = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === needle) return user;
    }
    return undefined;
  }

  signIn(
    email: string,
    password: string,
  ): { viewer: Viewer; sessionToken: string } {
    const user = this.findUserByEmail(email);
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }
    const sessionToken = newId('sess');
    this.sessions.set(sessionToken, user.id);
    return { viewer: this.toViewer(user), sessionToken };
  }

  signOut(sessionToken: string | null): void {
    if (sessionToken) this.sessions.delete(sessionToken);
    this.currentUser = null;
  }

  /** Restores `currentUser` from a session token — called once per request by middleware. */
  setCurrentUserFromSession(sessionToken: string | null): void {
    this.currentUser = null;
    if (!sessionToken) return;
    const userId = this.sessions.get(sessionToken);
    if (userId) this.currentUser = this.users.get(userId) ?? null;
  }

  getViewer(): Viewer | null {
    const user = this.currentUser;
    return user ? this.toViewer(user) : null;
  }

  private toViewer(user: User): Viewer {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  }

  getAccountSettings(): AccountSettings {
    const user = this.currentUser;
    if (!user) throw new Error('Not signed in');
    const preferences = this.preferencesOf(user.id);
    return {
      name: user.name,
      email: user.email,
      preferences: {
        defaultRuntime: preferences.defaultRuntime,
        deploymentEmails: preferences.deploymentEmails,
        productUpdates: preferences.productUpdates,
      },
    };
  }

  updateAccountSettings(settings: AccountSettings): void {
    const user = this.currentUser;
    if (!user) throw new Error('Not signed in');
    user.name = settings.name;
    const preferences = this.preferencesOf(user.id);
    preferences.defaultRuntime = settings.preferences.defaultRuntime;
    preferences.deploymentEmails = settings.preferences.deploymentEmails;
    preferences.productUpdates = settings.preferences.productUpdates;
  }

  deleteAccount(): void {
    this.currentUser = null;
  }

  private preferencesOf(userId: string): AccountPreferences {
    let preferences = this.preferences.get(userId);
    if (!preferences) {
      preferences = {
        defaultRuntime: 'nextjs',
        deploymentEmails: true,
        productUpdates: true,
      };
      this.preferences.set(userId, preferences);
    }
    return preferences;
  }

  // ── projects ─────────────────────────────────────────────────────────────────

  createProject(
    input: {
      name: string;
      repositoryId: string;
      branch: string;
      runtime: string;
      config: ProjectConfigInput;
      env: { key: string; value: string }[];
    },
    id?: string,
  ): Project {
    const repository = this.repositories.get(input.repositoryId);
    const project: Project = {
      id: id ?? newId('proj'),
      name: input.name,
      runtime: input.runtime,
      state: 'QUEUED',
      url: null,
      repository: repository ? repository.fullName : '',
      branch: input.branch,
      updatedAt: isoNow(),
      latest: null,
      recent: [],
      createdAt: isoNow(),
      liveDeploymentId: null,
      envCount: 0,
      config: {
        runtimeVersion: this.defaultRuntimeVersion(input.runtime),
        buildCommand: input.config.buildCommand,
        startCommand: input.config.startCommand,
        port: input.config.port,
        rootDirectory: input.config.rootDirectory,
      },
      env: this.applyEnv(input.env),
    };
    this.projects.set(project.id, project);
    this.recordActivity(
      this.currentUser,
      'project.created',
      input.name,
      project.id,
      null,
      'created project',
    );
    return project;
  }

  /** The variables a project was created with, plus every saved one. */
  applyEnv(env: { key: string; value: string }[]): ProjectEnvVar[] {
    const variables = env.map((variable, index) => ({
      key: variable.key,
      value: variable.value,
      updatedAt: new Date(Date.now() + index).toISOString(),
    }));
    variables.sort((a, b) => a.key.localeCompare(b.key));
    return variables;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  listProjects(): Project[] {
    return [...this.projects.values()];
  }

  updateProject(
    id: string,
    update: {
      name?: string;
      branch?: string;
      config?: Partial<ProjectConfigInput>;
    },
  ): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;
    if (update.name !== undefined) project.name = update.name;
    if (update.branch !== undefined) project.branch = update.branch;
    const config = project.config;
    if (update.config) {
      if (update.config.buildCommand !== undefined)
        config.buildCommand = update.config.buildCommand;
      if (update.config.startCommand !== undefined)
        config.startCommand = update.config.startCommand;
      if (update.config.port !== undefined) config.port = update.config.port;
      if (update.config.rootDirectory !== undefined)
        config.rootDirectory = update.config.rootDirectory;
    }
    project.updatedAt = isoNow();
    this.recordActivity(
      this.currentUser,
      'project.renamed',
      project.name,
      project.id,
      null,
      'updated project',
    );
    return project;
  }

  deleteProject(id: string): void {
    const project = this.projects.get(id);
    if (!project) return;
    for (const deployment of this.deployments.values()) {
      if (deployment.projectId === id) this.deployments.delete(deployment.id);
    }
    this.projects.delete(id);
    this.recordActivity(
      this.currentUser,
      'project.deleted',
      project.name,
      id,
      null,
      'deleted project',
    );
  }

  getEnvVars(projectId: string): EnvVarRecord[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return project.env.map((variable) => ({
      key: variable.key,
      updatedAt: variable.updatedAt,
    }));
  }

  saveEnvVars(
    projectId: string,
    values: { key: string; value: string | null }[],
  ): EnvVarRecord[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    const saved = new Map<
      string,
      { value: string | null; updatedAt: string }
    >();
    for (const variable of project.env) {
      const entry = values.find((value) => value.key === variable.key);
      if (!entry) continue; // not part of the set — deleted
      saved.set(
        variable.key,
        entry.value === null
          ? { value: variable.value, updatedAt: variable.updatedAt }
          : { value: entry.value, updatedAt: new Date().toISOString() },
      );
    }
    // Add the variables that are in the submitted set but not yet tracked.
    for (const value of values) {
      if (value.value === null) continue; // null keeps the saved value; we never have it to send back
      if (saved.has(value.key)) continue;
      saved.set(value.key, {
        value: value.value,
        updatedAt: new Date().toISOString(),
      });
    }
    project.env = [...saved.entries()]
      .map(([key, variable]) => ({
        key,
        value: variable.value,
        updatedAt: variable.updatedAt,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
    const records = project.env.map((variable) => ({
      key: variable.key,
      updatedAt: variable.updatedAt,
    }));
    this.recordActivity(
      this.currentUser,
      'env.updated',
      project.name,
      projectId,
      null,
      `saved ${records.length} variables`,
    );
    return records;
  }

  // ── deployments ──────────────────────────────────────────────────────────────

  createDeployment(
    projectId: string,
    options: {
      trigger: DeploymentTrigger;
      commitSha: string;
      commitMessage: string;
      author: { name: string; avatarUrl: string | null };
      createdAt?: string;
    },
    id?: string,
  ): Deployment {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Unknown project');
    const previous = this.latestDeployment(projectId);
    const deployment: Deployment = {
      id: id ?? newId('dep'),
      projectId,
      projectName: project.name,
      runtime: project.runtime,
      state: 'QUEUED',
      live: false,
      commit: {
        sha: options.commitSha,
        message: options.commitMessage,
        branch: project.branch,
        author: options.author,
      },
      trigger: options.trigger,
      createdAt: options.createdAt ?? isoNow(),
      durationSeconds: null,
      url: null,
      config: {
        runtimeVersion: project.config.runtimeVersion,
        buildCommand: project.config.buildCommand,
        startCommand: project.config.startCommand,
        port: project.config.port,
      },
      previousLiveId: previous ? previous.id : null,
    };
    this.deployments.set(deployment.id, deployment);
    project.state = 'QUEUED';
    project.updatedAt = isoNow();
    this.recordActivity(
      this.currentUser,
      'deployment.started',
      project.name,
      projectId,
      deployment.id,
      `started by ${options.trigger}`,
    );
    return deployment;
  }

  getDeployment(id: string): Deployment | undefined {
    return this.deployments.get(id);
  }

  deploymentsOfProject(projectId: string): Deployment[] {
    return [...this.deployments.values()]
      .filter((deployment) => deployment.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** All deployments, newest first. */
  allDeployments(): Deployment[] {
    return [...this.deployments.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** The most recent deployment of a project, newest first. */
  latestDeployment(projectId: string): Deployment | undefined {
    const deployments = this.deploymentsOfProject(projectId);
    return deployments[0];
  }

  markLive(projectId: string, deploymentId: string): void {
    const deployment = this.deployments.get(deploymentId);
    const project = this.projects.get(projectId);
    if (!deployment || !project) return;
    for (const candidate of this.deployments.values()) {
      if (candidate.projectId === projectId && candidate.live) {
        candidate.live = false;
      }
    }
    deployment.live = true;
    deployment.state = 'RUNNING';
    deployment.url = this.urlOf(project.name);
    project.liveDeploymentId = deploymentId;
    project.state = 'RUNNING';
    project.updatedAt = isoNow();
  }

  /** Makes the deployment that was live before `deploymentId` live again. */
  rollbackTo(projectId: string, deploymentId: string): Deployment | undefined {
    const deployment = this.deployments.get(deploymentId);
    const project = this.projects.get(projectId);
    if (!deployment || !project) return undefined;
    const targetId = deployment.previousLiveId;
    if (!targetId) return undefined;
    const target = this.deployments.get(targetId);
    if (!target) return undefined;
    this.markLive(projectId, targetId);
    deployment.live = false;
    this.recordActivity(
      this.currentUser,
      'deployment.rolled_back',
      project.name,
      projectId,
      deploymentId,
      `rolled back to ${target.id}`,
    );
    return target;
  }

  /** Marks a deployment as finished, with how long its build took. */
  finishDeployment(deploymentId: string, state: DeploymentState): void {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;
    deployment.state = state;
    if (state !== 'RUNNING') {
      const seconds = Math.max(
        0,
        Math.round(
          (Date.now() - new Date(deployment.createdAt).getTime()) / 1000,
        ),
      );
      deployment.durationSeconds = seconds;
    }
  }

  // ── logs ─────────────────────────────────────────────────────────────────────

  appendBuildLog(
    deploymentId: string,
    entries: [BuildStepId, 'stdout' | 'stderr', string][],
  ): void {
    const lines = this.buildLog.get(deploymentId) ?? [];
    let n = lines.length ? lines[lines.length - 1].n + 1 : 1;
    for (const [step, stream, text] of entries) {
      lines.push({ n, at: isoNow(), step, stream, text });
      n += 1;
    }
    this.buildLog.set(deploymentId, lines);
  }

  appendRuntimeLog(
    deploymentId: string,
    entries: [RuntimeLogLevel, RuntimeLogSource, string][],
  ): void {
    const lines = this.runtimeLog.get(deploymentId) ?? [];
    let n = lines.length ? lines[lines.length - 1].n + 1 : 1;
    for (const [level, source, text] of entries) {
      lines.push({ n, at: isoNow(), level, source, text });
      n += 1;
    }
    this.runtimeLog.set(deploymentId, lines);
  }

  getBuildLog(
    deploymentId: string,
    after: number,
  ): { lines: BuildLogLine[]; end: number } {
    const lines = this.buildLog.get(deploymentId) ?? [];
    const end = lines.length ? lines[lines.length - 1].n : after;
    return { lines: lines.slice(after), end };
  }

  getRuntimeLog(
    deploymentId: string,
    after: number,
  ): { lines: RuntimeLogLine[]; end: number } {
    const lines = this.runtimeLog.get(deploymentId) ?? [];
    const end = lines.length ? lines[lines.length - 1].n : after;
    return { lines: lines.slice(after), end };
  }

  private readonly buildLog = new Map<string, BuildLogLine[]>();
  private readonly runtimeLog = new Map<string, RuntimeLogLine[]>();

  // ── activity ────────────────────────────────────────────────────────────────

  recordActivity(
    actor: User | null,
    type: ActivityType,
    projectName: string,
    projectId: string | null,
    deploymentId: string | null,
    detail: string | null,
  ): void {
    const event: ActivityEvent = {
      id: newId('evt'),
      at: isoNow(),
      type,
      actor: { name: actor ? actor.name : 'system' },
      project: projectId ? { id: projectId, name: projectName } : null,
      deployment: deploymentId ? this.deploymentRef(deploymentId) : null,
      detail,
    };
    this.activity.set(event.id, event);
    this.activityOrder.unshift(event);
    while (this.activityOrder.length > MAX_ACTIVITY_LOG) {
      this.activityOrder.pop();
    }
  }

  private deploymentRef(deploymentId: string): ActivityEvent['deployment'] {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return null;
    return {
      id: deployment.id,
      sha: deployment.commit.sha,
      message: deployment.commit.message,
      branch: deployment.commit.branch,
      state: deployment.state,
      trigger: deployment.trigger,
    };
  }

  activityPage(afterCursor: string | null, limit: number): ActivityPage {
    const startIndex = afterCursor
      ? this.activityOrder.findIndex((event) => event.id === afterCursor) + 1
      : 0;
    const endIndex = startIndex + limit;
    const window = this.activityOrder.slice(startIndex, endIndex);
    let nextCursor: string | null = null;
    if (endIndex < this.activityOrder.length) {
      nextCursor = window[window.length - 1]?.id ?? null;
    }
    return { items: window, nextCursor };
  }

  recentActivity(limit: number): ActivityEvent[] {
    return this.activityOrder.slice(0, limit);
  }

  // ── access log (traffic & metrics) ──────────────────────────────────────────

  appendRequest(
    deployment: Deployment,
    error: boolean,
    city: string,
    status: number,
    latencyMs: number,
    path: string,
  ): void {
    const point: TrafficPoint = {
      at: new Date().toISOString(),
      projectId: deployment.projectId,
      error,
      city,
      status,
      latencyMs,
      path,
    };
    this.requests.push(point);
    if (this.requests.length > MAX_REQUEST_LOG) {
      this.requests.shift();
    }
  }

  getRequests(): TrafficPoint[] {
    return this.requests;
  }

  requestsOfProject(projectId: string): TrafficPoint[] {
    return this.requests.filter((point) => point.projectId === projectId);
  }

  getLiveDeployments(): Deployment[] {
    const live: Deployment[] = [];
    for (const deployment of this.deployments.values()) {
      if (deployment.live) live.push(deployment);
    }
    return live;
  }

  // ── git ──────────────────────────────────────────────────────────────────────

  getConnection(): GitConnection {
    return {
      provider: 'github',
      connected: this.connectedAccount !== null,
      account: this.connectedAccount,
    };
  }

  getRepositories(q?: string): GitRepository[] {
    const repositories = [...this.repositories.values()];
    if (!q) return repositories;
    const needle = q.toLowerCase();
    return repositories.filter((repository) =>
      repository.fullName.toLowerCase().includes(needle),
    );
  }

  getBranches(repositoryId: string): GitBranch[] {
    return this.branches.get(repositoryId) ?? [];
  }

  detect(repositoryId: string, _branch: string): GitDetection {
    const runtime =
      repositoryId === 'repo_storefront'
        ? 'nextjs'
        : repositoryId === 'repo_api'
          ? 'node'
          : null;
    return {
      runtime,
      evidence: runtime ? `package.json (${runtime})` : null,
      buildCommand: runtime === 'nextjs' ? 'npm run build' : 'npm run build',
      startCommand: runtime === 'nextjs' ? 'npm start' : 'node server.js',
      port: runtime === 'nextjs' ? 3000 : 8080,
      envExample: [],
    };
  }

  /** The public URL a project's current deployment would serve. */
  urlOf(projectName: string): string {
    return `https://${projectName}.deplogram.app`;
  }

  private defaultRuntimeVersion(runtime: string): string {
    switch (runtime) {
      case 'nextjs':
        return '22.14.0';
      case 'node':
        return '22.x';
      case 'python':
        return '3.12';
      case 'php':
        return '8.3';
      case 'go':
        return '1.23';
      default:
        return 'latest';
    }
  }
}
