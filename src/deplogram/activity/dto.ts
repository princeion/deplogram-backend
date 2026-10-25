import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityEventDto {
  @ApiProperty({ example: 'evt_abc123' })
  id: string;

  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  at: string;

  @ApiProperty({ example: 'deployment.started' })
  type: string;

  @ApiProperty({ type: Object })
  actor: { name: string };

  @ApiPropertyOptional({ type: Object })
  project: { id: string | null; name: string } | null;

  @ApiPropertyOptional({ type: Object })
  deployment: {
    id: string;
    sha: string;
    message: string;
    branch: string;
    state: string;
    trigger: string;
  } | null;

  @ApiPropertyOptional({ example: 'added SENTRY_DSN' })
  detail: string | null;
}

export class ActivityPageDto {
  @ApiProperty({ type: [ActivityEventDto] })
  items: ActivityEventDto[];

  @ApiPropertyOptional({ example: 'evt_abc123' })
  nextCursor: string | null;
}
