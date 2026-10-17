import { Injectable } from '@nestjs/common';

import { DeplogramStore } from '../store.js';

/**
 * Authentication is owned by the backend: the frontend only reads who is signed
 * in and calls sign-in / sign-out. Sessions live in memory, so signing out ends
 * them for good.
 */
@Injectable()
export class AuthService {
  constructor(private readonly store: DeplogramStore) {}

  /** The signed-in user, or null once signed out. */
  getViewer() {
    return this.store.getViewer();
  }

  signIn(email: string, password: string) {
    return this.store.signIn(email, password);
  }

  signOut(sessionToken: string | null): void {
    this.store.signOut(sessionToken);
  }
}
