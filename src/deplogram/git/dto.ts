import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GitConnectionDto {
  @ApiProperty({ example: 'github' })
  provider: string;

  @ApiProperty({ example: true })
  connected: boolean;

  @ApiPropertyOptional({ example: 'princeion' })
  account: string | null;
}

export class GitBranchDto {
  @ApiProperty({ example: 'main' })
  name: string;

  @ApiProperty({ type: Object })
  commit: { sha: string; message: string };
}

export class GitRepositoryDto {
  @ApiProperty({ example: 'repo_storefront' })
  id: string;

  @ApiProperty({ example: 'acme/storefront' })
  fullName: string;

  @ApiProperty({ example: false })
  private: boolean;

  @ApiProperty({ example: 'main' })
  defaultBranch: string;

  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  updatedAt: string;

  @ApiPropertyOptional({ example: 'proj_storefront' })
  projectId: string | null;
}

export class GitDetectionDto {
  @ApiPropertyOptional({ example: 'nextjs' })
  runtime: string | null;

  @ApiPropertyOptional({ example: 'package.json (nextjs)' })
  evidence: string | null;

  @ApiPropertyOptional({ example: 'npm run build' })
  buildCommand: string | null;

  @ApiPropertyOptional({ example: 'npm start' })
  startCommand: string | null;

  @ApiPropertyOptional({ example: 3000 })
  port: number | null;

  @ApiProperty({ type: [String], example: [] })
  envExample: string[];
}
