import { Injectable, InjectionToken, inject } from '@angular/core';

/** The part of the Web Locks API the coordinator needs. */
export interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export const LOCK_MANAGER = new InjectionToken<LockManagerLike | undefined>('LOCK_MANAGER', {
  providedIn: 'root',
  factory: () => (globalThis.navigator as Navigator | undefined)?.locks as LockManagerLike | undefined,
});

const LOCK_NAME = 'resume-refresh';

/**
 * Runs one token refresh at a time. Within a tab, concurrent callers share
 * the in-flight refresh; across tabs, a Web Lock makes them take turns, so
 * the next tab presents the cookie the previous one just rotated instead of
 * replaying the old one (which the backend treats as theft).
 */
@Injectable({ providedIn: 'root' })
export class RefreshCoordinator {
  private readonly locks = inject(LOCK_MANAGER, { optional: true }) ?? undefined;
  private inFlight: Promise<unknown> | null = null;

  run<T>(refresh: () => Promise<T>): Promise<T> {
    if (this.inFlight) {
      return this.inFlight as Promise<T>;
    }
    const attempt = this.locks ? this.locks.request(LOCK_NAME, refresh) : refresh();
    const shared = attempt.finally(() => (this.inFlight = null));
    this.inFlight = shared;
    return shared;
  }
}
