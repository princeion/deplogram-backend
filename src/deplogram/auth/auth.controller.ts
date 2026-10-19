import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { DeplogramStore } from '../store.js';
import type { Viewer } from '../types.js';
import { SESSION_COOKIE } from './session.middleware.js';

/** How long a session cookie lasts (30 days). */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The sign-up form posts these three fields (deplogram-web `SignupForm`). */
interface SignUpBody {
  name?: string;
  email?: string;
  password?: string;
}

interface SignInBody {
  email?: string;
  password?: string;
}

/**
 * Authentication is owned by the backend: the frontend only reads who is signed
 * in and calls sign-in / sign-up / sign-out. Sessions live in a cookie
 * (`deplogram_session`), so signing out clears it for good.
 */
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly store: DeplogramStore) {}

  @Post('sign-in')
  @HttpCode(200)
  signIn(
    @Body() body: SignInBody,
    @Res({ passthrough: true }) res: Response,
  ): Viewer {
    if (process.env.SIGN_IN_ENABLED === 'false') {
      throw new ForbiddenException('Sign-in is disabled');
    }
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) {
      throw new BadRequestException('Enter your email and password');
    }

    let session: { viewer: Viewer; sessionToken: string };
    try {
      session = this.store.signIn(email, password);
    } catch {
      throw new UnauthorizedException('Invalid email or password');
    }
    res.setHeader('Set-Cookie', this.sessionCookie(session.sessionToken));
    return session.viewer;
  }

  /**
   * Creates an account and starts a session. The web sign-up form posts
   * `{ name, email, password }`; the viewer it returns matches `viewerSchema`.
   */
  @Post('sign-up')
  @HttpCode(201)
  signUp(
    @Body() body: SignUpBody,
    @Res({ passthrough: true }) res: Response,
  ): Viewer {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!name) throw new BadRequestException('Enter your name');
    if (name.length > 64) {
      throw new BadRequestException('Keep your name under 64 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (this.store.findUserByEmail(email)) {
      throw new ConflictException('That email is already registered');
    }

    const { viewer, sessionToken } = this.store.signUp({
      name,
      email,
      password,
    });
    res.setHeader('Set-Cookie', this.sessionCookie(sessionToken));
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
    res.setHeader('Set-Cookie', this.expiredSessionCookie());
  }

  private sessionCookie(token: string): string {
    return this.cookie(token, SESSION_MAX_AGE_SECONDS);
  }

  private expiredSessionCookie(): string {
    return this.cookie('', 0);
  }

  /**
   * `SameSite=None; Secure` in production so the cookie also travels between
   * deplogram.app and the API's own origin; `Lax` locally, where there is no HTTPS.
   */
  private cookie(value: string, maxAge: number): string {
    const secure =
      process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const parts = [
      `${SESSION_COOKIE}=${value}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAge}`,
    ];
    if (secure) parts.push('Secure');
    parts.push(`SameSite=${secure ? 'None' : 'Lax'}`);
    return parts.join('; ');
  }
}
