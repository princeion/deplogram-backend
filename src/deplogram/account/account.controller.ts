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

/**
 * Everything about the signed-in account: its settings and its own deletion.
 */
@Controller('v1/me')
export class AccountController {
  constructor(private readonly store: DeplogramStore) {}

  /** The signed-in user, or 401 when nobody is signed in. */
  @Get()
  @HttpCode(200)
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
  getSettings(): AccountSettings {
    this.signedIn();
    return this.store.getAccountSettings();
  }

  @Patch('settings')
  @HttpCode(200)
  updateSettings(@Body() body: AccountSettings): AccountSettings {
    this.signedIn();
    this.store.updateAccountSettings(body);
    return this.store.getAccountSettings();
  }

  @Delete()
  @HttpCode(204)
  deleteAccount(): void {
    this.signedIn();
    this.store.deleteAccount();
  }
}
