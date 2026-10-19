import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { Observable, Subscription, catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';
import type { ResumeRequest } from '../core/api/types';

/** How long the selection must stay still before the PDF is re-rendered. */
export const PREVIEW_DELAY_MS = 500;

/**
 * The live PDF preview. Each new request cancels the render still in flight
 * (switchMap), so a slow older response can never replace a newer PDF.
 */
export class Preview {
  readonly url = signal<string | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  private readonly subscription: Subscription;

  constructor(http: HttpClient, requests: Observable<ResumeRequest>) {
    this.subscription = requests
      .pipe(
        debounceTime(PREVIEW_DELAY_MS),
        tap(() => this.loading.set(true)),
        switchMap((request) =>
          http.post('/api/resumes/preview', request, { responseType: 'blob' }).pipe(
            map((pdf): Blob | null => pdf),
            catchError(() => of(null)),
          ),
        ),
      )
      .subscribe((pdf) => this.show(pdf));
  }

  stop(): void {
    this.subscription.unsubscribe();
    this.replace(null);
  }

  private show(pdf: Blob | null): void {
    this.loading.set(false);
    this.failed.set(pdf === null);
    if (pdf) {
      this.replace(URL.createObjectURL(pdf));
    }
  }

  private replace(next: string | null): void {
    const previous = this.url();
    this.url.set(next);
    if (previous) {
      URL.revokeObjectURL(previous);
    }
  }
}
