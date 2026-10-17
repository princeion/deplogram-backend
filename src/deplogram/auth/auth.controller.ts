import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { DeplogramStore } from '../store.js';
import type { Viewer } from '../types.js';
import { SESSION_COOKIE } from './session.middleware.js';

/**
 * Authentication is owned by the backend: the frontend only reads who is signed
 * in and calls sign-in / sign-out. Sessions live in a cookie (`deplogram_session`),
 * so signing out clears it for good.
 */
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly store: DeplogramStore) {}

  @Post('sign-in')
  @HttpCode(200)
  signIn(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ): Viewer {
    const { viewer, sessionToken } = this.store.signIn(
      body.email,
      body.password,
    );
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
    );
    return viewer;
  }

  @Post('sign-out')
  @HttpCode(204)
  signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): void {
    const token = req.cookies?.[SESSION_COOKIE] ?? null;
    this.store.signOut(token);
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
    );
  }
}
