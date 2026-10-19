import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toProblem } from '../api/problem';
import type { Me } from '../api/types';
import { RefreshCoordinator } from './refresh-coordinator';

/** Problem type the backend gives a refresh that lost a race with another tab (AuthController). */
export const CONCURRENT_REFRESH_TYPE = 'urn:resume-tailor:problem:concurrent-refresh';

/** How long the loser of a refresh race waits for the winner's new cookie to land before retrying. */
const RACE_RETRY_DELAY_MS = 1000;

interface AccessToken {
  accessToken: string;
}

/**
 * The signed-in session. The access token lives only in this signal: never
 * in storage, so a script injected into the page cannot read it later. The
 * long-lived refresh token is an HttpOnly cookie the browser handles.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly coordinator = inject(RefreshCoordinator);

  readonly accessToken = signal<string | null>(null);
  readonly user = signal<Me | null>(null);
  readonly isSignedIn = computed(() => this.accessToken() !== null);

  acceptToken(token: string): void {
    this.accessToken.set(token);
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AccessToken>('/api/auth/login', { email, password }),
    );
    this.acceptToken(response.accessToken);
    await this.loadUser();
  }

  /** Restores a session from the refresh cookie, e.g. on page load or after Google sign-in. */
  async restore(): Promise<void> {
    try {
      if (await this.refresh()) {
        await this.loadUser();
      }
    } catch {
      // Server unreachable: start signed out; the next sign-in or reload tries again.
    }
  }

  /**
   * A new access token, or null when the session is over. One refresh at a
   * time, across tabs. A network or server failure rejects instead: the
   * session may still be valid, so it is kept.
   */
  refresh(): Promise<string | null> {
    return this.coordinator.run(() => this.exchange(true));
  }

  private async exchange(mayRetry: boolean): Promise<string | null> {
    try {
      const response = await firstValueFrom(this.http.post<AccessToken>('/api/auth/refresh', null));
      this.acceptToken(response.accessToken);
      return response.accessToken;
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status < 400 || error.status >= 500) {
        throw error;
      }
      // Without Web Locks (an insecure origin), another tab can rotate the cookie under this
      // request. The session is fine: wait for the new cookie and try once more.
      if (mayRetry && toProblem(error).type === CONCURRENT_REFRESH_TYPE) {
        await new Promise((resolve) => setTimeout(resolve, RACE_RETRY_DELAY_MS));
        return this.exchange(false);
      }
      this.clear();
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', null));
    } catch {
      // The local session ends regardless; the cookie expires on its own.
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  private async loadUser(): Promise<void> {
    this.user.set(await firstValueFrom(this.http.get<Me>('/api/me')));
  }
}
