/**
 * Shared domain types for the Deplogram API (`/v1/*`).
 *
 * They mirror the contracts the web frontend expects (see
 * `deplogram-web/src/features/**`); the HTTP layer maps these onto JSON.
 */

// ── Deployment lifecycle ────────────────────────────────────────────────────────

export const DEPLOYMENT_STATES = [
  'QUEUED',
  'BUILDING',
  'BUILT',
  'DEPLOYING',
  'RUNNING',
  'BUILD_FAILED',
  'DEPLOY_FAILED',
  'CRASHED',
] as const;
export type DeploymentState = (typeof DEPLOYMENT_STATES)[number];

export const BUILD_STEP_IDS = [
  'clone',
  'install',
  'build',
  'deploy',
  'runtime',
] as const;
export type BuildStepId = (typeof BUILD_STEP_IDS)[number];

export const BUILD_STEP_STATES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'skipped',
] as const;
export type BuildStepState = (typeof BUILD_STEP_STATES)[number];

export const BUILD_LOG_STREAMS = ['stdout', 'stderr'] as const;
export type BuildLogStream = (typeof BUILD_LOG_STREAMS)[number];

export const RUNTIME_LOG_LEVELS = ['info', 'warn', 'error'] as const;
export type RuntimeLogLevel = (typeof RUNTIME_LOG_LEVELS)[number];

export const RUNTIME_LOG_SOURCES = ['request', 'app'] as const;
export type RuntimeLogSource = (typeof RUNTIME_LOG_SOURCES)[number];

export const DEPLOYMENT_TRIGGERS = [
  'git',
  'manual',
  'redeploy',
  'rollback',
] as const;
export type DeploymentTrigger = (typeof DEPLOYMENT_TRIGGERS)[number];

/** Lifecycle states that are still in progress (used for polling hints). */
export const DEPLOYMENT_IN_PROGRESS: readonly DeploymentState[] = [
  'QUEUED',
  'BUILDING',
  'BUILT',
  'DEPLOYING',
];

// ── Accounts, workspace and plans ──────────────────────────────────────────────

export type Plan = 'free' | 'plus' | 'pro' | 'enterprise';

export type UsageLimitId =
  'active_deployments' | 'build_minutes' | 'bandwidth' | 'storage';

export const PLANS: readonly Plan[] = ['free', 'plus', 'pro', 'enterprise'];

export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  /** Demo only — a real deployment hashes this before storing it. */
  password: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  kind: 'personal' | 'team';
  plan: Plan;
}

export interface Viewer {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface AccountPreferences {
  defaultRuntime: string;
  deploymentEmails: boolean;
  productUpdates: boolean;
}

export interface AccountSettings {
  name: string;
  email: string;
  preferences: AccountPreferences;
}

// ── Projects ────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  runtimeVersion: string;
  buildCommand: string | null;
  startCommand: string | null;
  port: number | null;
  rootDirectory: string | null;
}

export interface ProjectEnvVar {
  key: string;
  value: string | null;
  updatedAt: string;
}

export interface ProjectDeploymentRef {
  id: string;
  state: DeploymentState;
  live: boolean;
  sha: string;
  message: string;
  createdAt: string;
}

/** What `GET /v1/projects` returns per project. */
export interface ProjectSummary {
  id: string;
  name: string;
  runtime: string;
  state: DeploymentState;
  /** Deployment URL host while RUNNING, else null. */
  url: string | null;
  /** "owner/name" of the connected repository. */
  repository: string;
  branch: string;
  updatedAt: string;
  latest: ProjectDeploymentRef | null;
  /** States of the most recent deployments, newest first (up to 10). */
  recent: DeploymentState[];
}

/** What `GET /v1/projects/:id` returns — the summary plus its configuration. */
export interface Project extends ProjectSummary {
  createdAt: string;
  liveDeploymentId: string | null;
  envCount: number;
  config: ProjectConfig;
  /** The variables, with their current values. */
  env: ProjectEnvVar[];
}

export type EnvVarRecord = { key: string; updatedAt: string };

/** `PUT /v1/projects/:id/env` — the whole variable set, value null keeps the saved one. */
export type ProjectEnvValues = { key: string; value: string | null }[];

export interface CreateProjectInput {
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
}

/** What can be changed on a project through `PATCH /v1/projects/:id`. */
export interface ProjectUpdate {
  name?: string;
  branch?: string;
  config?: {
    buildCommand?: string | null;
    startCommand?: string | null;
    port?: number | null;
    rootDirectory?: string | null;
  };
}

export interface NameAvailability {
  available: boolean;
  /** The project's URL if the name is taken. */
  url: string;
  suggestion: string | null;
}

// ── Deployments ────────────────────────────────────────────────────────────────

export interface DeploymentCommit {
  sha: string;
  message: string;
  branch: string;
  author: { name: string; avatarUrl: string | null };
}

export interface DeploymentConfigSnapshot {
  runtimeVersion: string;
  buildCommand: string | null;
  startCommand: string | null;
  /** null for static sites (served from storage, no container). */
  port: number | null;
}

export interface Deployment {
  id: string;
  projectId: string;
  projectName: string;
  runtime: string;
  state: DeploymentState;
  /** The project's current live deployment. */
  live: boolean;
  commit: DeploymentCommit;
  trigger: DeploymentTrigger;
  createdAt: string;
  /** Seconds from QUEUED to RUNNING or to the failure; null while in progress. */
  durationSeconds: number | null;
  url: string | null;
  config: DeploymentConfigSnapshot;
  /** The deployment that was live before this one — what a rollback rolls forward to. */
  previousLiveId: string | null;
}

export interface BuildLogLine {
  /** 1-based line number, stable — used as the cursor (`after`). */
  n: number;
  at: string;
  step: BuildStepId;
  stream: BuildLogStream;
  /** Raw text; may contain ANSI colour codes. */
  text: string;
}

export interface BuildStep {
  id: BuildStepId;
  label: string;
  state: BuildStepState;
  startedAt: string | null;
  endedAt: string | null;
}

export interface DeploymentLogs {
  lines: BuildLogLine[];
  steps: BuildStep[];
  done: boolean;
}

export interface RuntimeLogLine {
  n: number;
  at: string;
  level: RuntimeLogLevel;
  /** "request" lines are the platform's access log; "app" lines are what the app printed. */
  source: RuntimeLogSource;
  text: string;
}

export interface RuntimeLogs {
  lines: RuntimeLogLine[];
  live: boolean;
}

// ── Activity ───────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'deployment.started'
  | 'deployment.succeeded'
  | 'deployment.failed'
  | 'deployment.rolled_back'
  | 'project.created'
  | 'project.renamed'
  | 'project.deleted'
  | 'env.updated'
  | 'settings.updated';

export interface ActivityEvent {
  id: string;
  at: string;
  type: ActivityType;
  actor: { name: string };
  project: { id: string | null; name: string } | null;
  deployment: {
    id: string;
    sha: string;
    message: string;
    branch: string;
    state: DeploymentState;
    trigger: DeploymentTrigger;
  } | null;
  /** A short, already-written detail, e.g. "added SENTRY_DSN, removed REDIS_URL". */
  detail: string | null;
}

export type ActivityFilter = 'all' | 'deploys' | 'changes' | 'failures';

export interface ActivityPage {
  items: ActivityEvent[];
  nextCursor: string | null;
}

// ── Git ────────────────────────────────────────────────────────────────────────

export interface GitConnection {
  provider: 'github';
  connected: boolean;
  account: string | null;
}

export interface GitRepository {
  id: string;
  /** "owner/name" */
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  /** Already imported as a project — importing again creates a second project. */
  projectId: string | null;
}

export interface GitBranch {
  name: string;
  commit: { sha: string; message: string };
}

export interface GitDetection {
  runtime: string | null;
  /** What gave it away: "package.json (next)", "go.mod", … */
  evidence: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  port: number | null;
  /** Variable names from .env.example, if the repo has one. Values are never read. */
  envExample: string[];
}

// ── Traffic, metrics and usage ─────────────────────────────────────────────────

export type MetricsRange = '1h' | '24h' | '7d';

export interface TrafficPoint {
  at: string;
  projectId: string;
  error: boolean;
  city: string;
  /** HTTP status the request ended with. */
  status: number;
  /** Round-trip time in milliseconds. */
  latencyMs: number;
  /** The path that was requested. */
  path: string;
}

export interface Traffic {
  /** Every request in the last ~65 seconds across live projects. */
  requests: TrafficPoint[];
  liveProjects: number;
}

export interface MetricsPoint {
  t: string;
  requests: number;
  errors: number;
  p50: number;
  p95: number;
  cpu: number;
  memory: number;
}

export interface MetricsSummary {
  requests: number;
  errorRate: number;
  p95: number;
  uptime: number;
}

export interface StatusBreakdown {
  ok: number;
  redirect: number;
  clientError: number;
  serverError: number;
}

export interface Metrics {
  range: MetricsRange;
  summary: MetricsSummary;
  /** One point per bucket (5 min for 1h, 1 h for 24h, 6 h for 7d). */
  series: MetricsPoint[];
  statuses: StatusBreakdown;
  /** Busiest paths. */
  paths: { path: string; requests: number; p95: number }[];
  /** Container memory limit in MB. */
  memoryLimit: number;
}

export interface UsageLimit {
  id: UsageLimitId;
  label: string;
  used: number;
  limit: number;
  unit: 'count' | 'minutes' | 'bytes';
}

export interface Usage {
  period: { start: string; end: string };
  limits: UsageLimit[];
  /** Requests served across all projects, per day, this period and the one before. */
  requests: { date: string; requests: number; previous: number }[];
  /** Builds per day, by outcome. */
  builds: { date: string; succeeded: number; failed: number }[];
  bandwidthByProject: { projectId: string; name: string; bytes: number }[];
  storageByKind: { kind: string; bytes: number }[];
  /** Requests by weekday (Mon first) and hour of day, UTC — 7 rows × 24 columns. */
  trafficByHour: number[][];
  /** Share of the period every running deployment answered health checks, 0–1. */
  uptime: number;
}

// ── Storage (the workspace drive) ──────────────────────────────────────────────

export type StorageKind = 'folder' | 'file';
export type LinkExpiry = '1h' | '1d' | '7d';

/** One item on the workspace drive. Folders carry totals; files carry their bytes. */
export interface StorageItem {
  kind: StorageKind;
  name: string;
  /** Full path from the top of the drive, e.g. "assets/logos/logo.svg". */
  path: string;
  /** Bytes; for a folder, everything inside it. */
  size: number;
  /** Files only: MIME type. */
  contentType: string | null;
  /** Folders only: direct children. */
  items: number | null;
  createdAt: string;
  updatedAt: string;
  /** Images only: a small thumbnail URL. */
  thumbnailUrl: string | null;
  /** Folders: made public. Files: inside a public folder (inherited). */
  public: boolean;
  /** Files in a public folder: their permanent address. */
  publicUrl: string | null;
}

export interface StorageList {
  path: string;
  items: StorageItem[];
  /** This folder's files are public: it, or a folder above it, was made public. */
  public: boolean;
  /** The folder that made it public ("" never — the top of the drive can't be public). */
  publicFrom: string | null;
}

export interface StorageLink {
  url: string;
  expiresAt: string;
}

export interface StorageUpload {
  uploadUrl: string;
}

export interface StoragePreview {
  /** A short-lived URL for images, video, audio and PDFs; null when there's nothing to show. */
  url: string | null;
  /** The text of text-like files (code, CSV, JSON, Markdown), up to a limit. */
  text: string | null;
  truncated: boolean;
}

// ── CodePad (standalone pads that run and deploy) ──────────────────────────────

export type PadTemplate = 'static' | 'node' | 'python';

export interface PadFile {
  path: string;
  content: string;
  updatedAt: string;
}

export interface PadSummary {
  id: string;
  name: string;
  runtime: string;
  fileCount: number;
  /** File paths, for previews in the list (no contents). */
  paths: string[];
  updatedAt: string;
  /** Set once the pad has been deployed: the project it became. */
  projectId: string | null;
}

export interface Pad extends PadSummary {
  files: PadFile[];
  /** The file to open first. */
  entry: string;
}

export interface RunLogLine {
  n: number;
  at: string;
  text: string;
  stream: 'stdout' | 'stderr';
}

export interface RunLogs {
  lines: RunLogLine[];
  done: boolean;
  /** null while running. */
  exitCode: number | null;
}
