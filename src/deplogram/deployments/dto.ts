import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeploymentCommitDto {
  @ApiProperty({ example: 'a1b2c3d' })
  sha: string;

  @ApiProperty({ example: 'feat: live traffic dashboard' })
  message: string;

  @ApiProperty({ example: 'main' })
  branch: string;

  @ApiProperty({ type: Object })
  author: { name: string; avatarUrl: string | null };
}

export class DeploymentConfigSnapshotDto {
  @ApiProperty({ example: '22.14.0' })
  runtimeVersion: string;

  @ApiPropertyOptional({ example: 'npm run build' })
  buildCommand: string | null;

  @ApiPropertyOptional({ example: 'npm start' })
  startCommand: string | null;

  @ApiPropertyOptional({ example: 3000 })
  port: number | null;
}

export class DeploymentDto {
  @ApiProperty({ example: 'dep_live' })
  id: string;

  @ApiProperty({ example: 'proj_storefront' })
  projectId: string;

  @ApiProperty({ example: 'storefront' })
  projectName: string;

  @ApiProperty({ example: 'nextjs' })
  runtime: string;

  @ApiProperty({ example: 'RUNNING' })
  state: string;

  @ApiProperty({ example: true })
  live: boolean;

  @ApiProperty({ type: DeploymentCommitDto })
  commit: DeploymentCommitDto;

  @ApiProperty({ example: 'git', enum: ['git', 'manual', 'redeploy', 'rollback'] })
  trigger: string;

  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  createdAt: string;

  @ApiPropertyOptional({ example: 240 })
  durationSeconds: number | null;

  @ApiPropertyOptional({ example: 'storefront.deplogram.app' })
  url: string | null;

  @ApiProperty({ type: DeploymentConfigSnapshotDto })
  config: DeploymentConfigSnapshotDto;

  @ApiPropertyOptional({ example: 'dep_old_1' })
  previousLiveId: string | null;
}

export class BuildLogLineDto {
  @ApiProperty({ example: 1 })
  n: number;

  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  at: string;

  @ApiProperty({ example: 'clone', enum: ['clone', 'install', 'build', 'deploy', 'runtime'] })
  step: string;

  @ApiProperty({ example: 'stdout', enum: ['stdout', 'stderr'] })
  stream: string;

  @ApiProperty({ example: 'Cloning into "storefront"…' })
  text: string;
}

export class BuildStepDto {
  @ApiProperty({ example: 'clone', enum: ['clone', 'install', 'build', 'deploy', 'runtime'] })
  id: string;

  @ApiProperty({ example: 'Clone the repository' })
  label: string;

  @ApiProperty({ example: 'succeeded', enum: ['pending', 'running', 'succeeded', 'failed', 'skipped'] })
  state: string;

  @ApiPropertyOptional({ example: '2026-10-20T03:11:53.675Z' })
  startedAt: string | null;

  @ApiPropertyOptional({ example: '2026-10-20T03:11:54.575Z' })
  endedAt: string | null;
}

export class DeploymentLogsDto {
  @ApiProperty({ type: [BuildLogLineDto] })
  lines: BuildLogLineDto[];

  @ApiProperty({ type: [BuildStepDto] })
  steps: BuildStepDto[];

  @ApiProperty({ example: true })
  done: boolean;
}

export class DeploymentPageDto {
  @ApiProperty({ type: [DeploymentDto] })
  items: DeploymentDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class RollbackResultDto {
  @ApiProperty({ type: DeploymentDto })
  deployment: DeploymentDto;

  @ApiPropertyOptional({ example: 'dep_live' })
  previousLiveId: string | null;
}
