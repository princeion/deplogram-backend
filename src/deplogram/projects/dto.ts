import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';

class ProjectConfigDto {
  @ApiPropertyOptional({ example: 'npm run build' })
  @IsOptional()
  @IsString()
  buildCommand?: string | null;

  @ApiPropertyOptional({ example: 'npm start' })
  @IsOptional()
  @IsString()
  startCommand?: string | null;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsNumber()
  port?: number | null;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  rootDirectory?: string | null;
}

export class EnvVarValueDto {
  @ApiProperty({ example: 'SECRET' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({ example: 'value' })
  @IsOptional()
  @IsString()
  value: string | null;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'storefront' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'repo_storefront' })
  @IsString()
  @IsNotEmpty()
  repositoryId: string;

  @ApiProperty({ example: 'main' })
  @IsString()
  @IsNotEmpty()
  branch: string;

  @ApiProperty({ example: 'nextjs' })
  @IsString()
  @IsNotEmpty()
  runtime: string;

  @ApiProperty({ type: ProjectConfigDto })
  config: {
    buildCommand: string | null;
    startCommand: string | null;
    port: number | null;
    rootDirectory: string | null;
  };

  @ApiProperty({ type: [EnvVarValueDto], example: [{ key: 'SECRET', value: 'value' }] })
  env: { key: string; value: string }[];
}

export class ProjectUpdateDto {
  @ApiPropertyOptional({ example: 'renamed-storefront' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'main' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ type: ProjectConfigDto })
  @IsOptional()
  config?: {
    buildCommand?: string | null;
    startCommand?: string | null;
    port?: number | null;
    rootDirectory?: string | null;
  };
}

export class EnvVarRecordDto {
  @ApiProperty({ example: 'SECRET' })
  key: string;

  @ApiProperty({ example: '2026-10-20T04:11:53.680Z' })
  updatedAt: string;
}

export class ProjectEnvVarDto {
  @ApiProperty({ example: 'SECRET' })
  key: string;

  @ApiProperty({ example: 'value' })
  value: string | null;

  @ApiProperty({ example: '2026-10-20T04:11:53.680Z' })
  updatedAt: string;
}

export class ProjectDeploymentRefDto {
  @ApiProperty({ example: 'dep_live' })
  id: string;

  @ApiProperty({ example: 'RUNNING' })
  state: string;

  @ApiProperty({ example: true })
  live: boolean;

  @ApiProperty({ example: 'a1b2c3d' })
  sha: string;

  @ApiProperty({ example: 'feat: live traffic dashboard' })
  message: string;

  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  createdAt: string;
}

export class ProjectSummaryDto {
  @ApiProperty({ example: 'proj_storefront' })
  id: string;

  @ApiProperty({ example: 'storefront' })
  name: string;

  @ApiProperty({ example: 'nextjs' })
  runtime: string;

  @ApiProperty({ example: 'RUNNING' })
  state: string;

  @ApiPropertyOptional({ example: 'storefront.deplogram.app' })
  url: string | null;

  @ApiProperty({ example: 'acme/storefront' })
  repository: string;

  @ApiProperty({ example: 'main' })
  branch: string;

  @ApiProperty({ example: '2026-10-20T04:11:53.680Z' })
  updatedAt: string;

  @ApiPropertyOptional({ type: ProjectDeploymentRefDto })
  latest: ProjectDeploymentRefDto | null;

  @ApiProperty({ type: [String], example: ['RUNNING', 'RUNNING', 'RUNNING'] })
  recent: string[];
}

export class ProjectDto extends ProjectSummaryDto {
  @ApiProperty({ example: '2026-10-20T03:11:53.675Z' })
  createdAt: string;

  @ApiPropertyOptional({ example: 'dep_live' })
  liveDeploymentId: string | null;

  @ApiProperty({ example: 0 })
  envCount: number;

  @ApiProperty({ type: ProjectConfigDto })
  config: {
    runtimeVersion: string;
    buildCommand: string | null;
    startCommand: string | null;
    port: number | null;
    rootDirectory: string | null;
  };

  @ApiProperty({ type: [ProjectEnvVarDto] })
  env: ProjectEnvVarDto[];
}

export class ProjectEnvValuesDto {
  @ApiProperty({ type: [EnvVarValueDto] })
  items: EnvVarValueDto[];
}

export class NameAvailabilityDto {
  @ApiProperty({ example: false })
  available: boolean;

  @ApiProperty({ example: 'storefront.deplogram.app' })
  url: string;

  @ApiPropertyOptional({ example: 'storefront-2' })
  suggestion: string | null;
}
