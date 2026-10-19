import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Me } from '../api/types';
import { RefreshCoordinator } from './refresh-coordinator';

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
    if (await this.refresh()) {
      await this.loadUser();
    }
  }

  /** A new access token, or null when the session is over. One refresh at a time, across tabs. */
  refresh(): Promise<string | null> {
    return this.coordinator.run(async () => {
      try {
        const response = await firstValueFrom(this.http.post<AccessToken>('/api/auth/refresh', null));
        this.acceptToken(response.accessToken);
        return response.accessToken;
      } catch {
        this.clear();
        return null;
      }
    });
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
