import { ApiProperty } from '@nestjs/swagger';

export class TrafficPointDto {
  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  at: string;

  @ApiProperty({ example: 'proj_storefront' })
  projectId: string;

  @ApiProperty({ example: false })
  error: boolean;

  @ApiProperty({ example: 'LAG' })
  city: string;

  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 45 })
  latencyMs: number;

  @ApiProperty({ example: '/v1/projects' })
  path: string;
}

export class TrafficDto {
  @ApiProperty({ type: [TrafficPointDto] })
  requests: TrafficPointDto[];

  @ApiProperty({ example: 2 })
  liveProjects: number;
}
