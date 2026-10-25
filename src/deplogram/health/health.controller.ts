import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check', description: 'Returns ok when the API is up.' })
  @ApiResponse({ status: 200, description: 'API is healthy', type: Object })
  health() {
    return { status: 'ok' };
  }
}
