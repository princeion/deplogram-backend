import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

import { DeplogramStore } from '../store.js';

const SESSION_COOKIE = 'deplogram_session';

/**
 * Restores the signed-in user for every request from the `deplogram_session`
 * cookie, so sign-in persists across HTTP calls (the frontend sends
 * `credentials: "include"`).
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly store: DeplogramStore) {}

  use(req: Request, res: Response, next: NextFunction): void {
    cookieParser()(req, res, () => {
      this.store.setCurrentUserFromSession(req.cookies[SESSION_COOKIE] ?? null);
      next();
    });
  }
}

export { SESSION_COOKIE };
