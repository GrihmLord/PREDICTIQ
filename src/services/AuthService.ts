// src/services/AuthService.ts
// Enterprise identity.
//
// The whole flow runs in the main process (electron/lib/oidc.js): OAuth 2.0
// authorization code with PKCE, opened in the user's real browser and returned
// over a loopback redirect. Tokens are held in the OS keystore. This module
// only relays status and claims.
//
// When no identity provider is configured the app says so. It does not
// manufacture a session.

import {getBridge, AuthProfile, AuthStatus} from './bridge';

export type UserProfile = AuthProfile;
export type {AuthStatus};

const UNAVAILABLE: AuthStatus = {
  configured: false,
  issuer: null,
  authenticated: false,
  profile: null,
  reason: 'Enterprise sign-in is only available in the desktop app.',
};

class AuthService {
  private cached: AuthStatus = UNAVAILABLE;

  /** Reads the current session from the main process. */
  async refresh(): Promise<AuthStatus> {
    const bridge = getBridge();
    if (!bridge) {
      this.cached = UNAVAILABLE;
      return this.cached;
    }
    try {
      this.cached = await bridge.auth.status();
    } catch (error) {
      this.cached = {
        configured: false,
        issuer: null,
        authenticated: false,
        profile: null,
        reason:
          error instanceof Error
            ? error.message
            : 'Could not read the sign-in state.',
      };
    }
    return this.cached;
  }

  /**
   * Starts the browser sign-in. Rejects with a message worth showing when the
   * provider is not configured or the user abandons the flow.
   */
  async login(): Promise<AuthStatus> {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error(UNAVAILABLE.reason as string);
    }
    this.cached = await bridge.auth.login();
    return this.cached;
  }

  async logout(): Promise<AuthStatus> {
    const bridge = getBridge();
    if (!bridge) {
      this.cached = UNAVAILABLE;
      return this.cached;
    }
    this.cached = await bridge.auth.logout();
    return this.cached;
  }

  getStatus(): AuthStatus {
    return this.cached;
  }

  getCurrentUser(): UserProfile | null {
    return this.cached.profile;
  }

  isAuthenticated(): boolean {
    return this.cached.authenticated;
  }
}

export const authService = new AuthService();
