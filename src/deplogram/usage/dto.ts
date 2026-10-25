import { ApiProperty } from '@nestjs/swagger';

export class MetricsPointDto {
  @ApiProperty({ example: '2026-10-20T03:00:00.000Z' })
  t: string;

  @ApiProperty({ example: 120 })
  requests: number;

  @ApiProperty({ example: 2 })
  errors: number;

  @ApiProperty({ example: 240 })
  p50: number;

  @ApiProperty({ example: 480 })
  p95: number;

  @ApiProperty({ example: 10 })
  cpu: number;

  @ApiProperty({ example: 256 })
  memory: number;
}

export class MetricsSummaryDto {
  @ApiProperty({ example: 1200 })
  requests: number;

  @ApiProperty({ example: 0.02 })
  errorRate: number;

  @ApiProperty({ example: 480 })
  p95: number;

  @ApiProperty({ example: 0.99 })
  uptime: number;
}

export class StatusBreakdownDto {
  @ApiProperty({ example: 1100 })
  ok: number;

  @ApiProperty({ example: 10 })
  redirect: number;

  @ApiProperty({ example: 60 })
  clientError: number;

  @ApiProperty({ example: 30 })
  serverError: number;
}

export class MetricsDto {
  @ApiProperty({ example: '24h', enum: ['1h', '24h', '7d'] })
  range: string;

  @ApiProperty({ type: MetricsSummaryDto })
  summary: MetricsSummaryDto;

  @ApiProperty({ type: [MetricsPointDto] })
  series: MetricsPointDto[];

  @ApiProperty({ type: StatusBreakdownDto })
  statuses: StatusBreakdownDto;

  @ApiProperty({ type: [Object] })
  paths: { path: string; requests: number; p95: number }[];

  @ApiProperty({ example: 512 })
  memoryLimit: number;
}

export class UsageLimitDto {
  @ApiProperty({ example: 'active_deployments' })
  id: string;

  @ApiProperty({ example: 'Active deployments' })
  label: string;

  @ApiProperty({ example: 2 })
  used: number;

  @ApiProperty({ example: 5 })
  limit: number;

  @ApiProperty({ example: 'count', enum: ['count', 'minutes', 'bytes'] })
  unit: string;
}

export class UsageDto {
  @ApiProperty({ type: Object })
  period: { start: string; end: string };

  @ApiProperty({ type: [UsageLimitDto] })
  limits: UsageLimitDto[];

  @ApiProperty({ type: [Object] })
  requests: { date: string; requests: number; previous: number }[];

  @ApiProperty({ type: [Object] })
  builds: { date: string; succeeded: number; failed: number }[];

  @ApiProperty({ type: [Object] })
  bandwidthByProject: { projectId: string; name: string; bytes: number }[];

  @ApiProperty({ type: [Object] })
  storageByKind: { kind: string; bytes: number }[];

  @ApiProperty()
  trafficByHour: number[][];

  @ApiProperty({ example: 0.99 })
  uptime: number;
}
