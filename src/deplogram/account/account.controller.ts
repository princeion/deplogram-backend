import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';

import { DeplogramStore } from '../store.js';
import type { AccountSettings, Viewer } from '../types.js';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AccountSettingsDto } from './dto.js';

/**
 * Everything about the signed-in account: its settings and its own deletion.
 */
@ApiTags('me')
@ApiCookieAuth('deplogram_session')
@Controller('v1/me')
export class AccountController {
  constructor(private readonly store: DeplogramStore) {}

  /** The signed-in user, or 401 when nobody is signed in. */
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the signed-in viewer', description: 'Returns 401 when signed out.' })
  @ApiResponse({ status: 200, description: 'The signed-in user', type: Object })
  @ApiResponse({ status: 401, description: 'No signed-in user' })
  me(): Viewer {
    const viewer = this.store.getViewer();
    if (!viewer) throw new UnauthorizedException('No signed-in user');
    return viewer;
  }

  /** The endpoints below belong to the signed-in user — without a session they answer 401. */
  private signedIn(): void {
    if (!this.store.getViewer())
      throw new UnauthorizedException('No signed-in user');
  }

  @Get('settings')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get account settings and preferences' })
  @ApiResponse({ status: 200, description: 'Account settings', type: AccountSettingsDto })
  @ApiResponse({ status: 401, description: 'No signed-in user' })
  getSettings(): AccountSettings {
    this.signedIn();
    return this.store.getAccountSettings();
  }

  @Patch('settings')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update account name and preferences' })
  @ApiBody({ type: AccountSettingsDto })
  @ApiResponse({ status: 200, description: 'Updated account settings', type: AccountSettingsDto })
  @ApiResponse({ status: 401, description: 'No signed-in user' })
  updateSettings(@Body() body: AccountSettings): AccountSettings {
    this.signedIn();
    this.store.updateAccountSettings(body);
    return this.store.getAccountSettings();
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the signed-in account' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({ status: 401, description: 'No signed-in user' })
  deleteAccount(): void {
    this.signedIn();
    this.store.deleteAccount();
  }
}
