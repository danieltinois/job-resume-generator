import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { Subscription, debounceTime, firstValueFrom } from 'rxjs';
import { toProblem } from '../core/api/problem';
import type { StoredProfile } from '../core/api/types';
import { type ProfileForm, applyProfileErrors, toProfile } from './profile-form';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'invalid' | 'error' | 'conflict';
export type ConflictChoice = 'reload' | 'keep';

export interface AutosaveHandlers {
  /** The profile changed elsewhere since it was loaded: ask the user what wins. */
  resolveConflict(): Promise<ConflictChoice>;
  /** Replace the form with the saved version. */
  reload(stored: StoredProfile): void;
}

/** How long typing must pause before the profile is saved. */
export const AUTOSAVE_DELAY_MS = 1500;

/**
 * Saves the profile a moment after the user stops typing. One save at a
 * time: changes made while a save is in flight are sent right after it,
 * with the version it returned. A conflict never discards local edits on
 * its own; the user decides.
 */
export class Autosave {
  readonly status = signal<SaveStatus>('idle');

  private subscription: Subscription | null = null;
  private inFlight = false;
  private pending = false;

  constructor(
    private readonly http: HttpClient,
    private readonly form: ProfileForm,
    private readonly version: WritableSignal<number>,
    private readonly handlers: AutosaveHandlers,
  ) {}

  start(): void {
    this.subscription = this.form.valueChanges
      .pipe(debounceTime(AUTOSAVE_DELAY_MS))
      .subscribe(() => void this.saveNow());
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  async saveNow(): Promise<void> {
    if (this.inFlight) {
      this.pending = true;
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set('invalid');
      return;
    }
    this.inFlight = true;
    this.status.set('saving');
    try {
      const saved = await firstValueFrom(
        this.http.put<{ version: number }>('/api/profile', { version: this.version(), data: toProfile(this.form) }),
      );
      this.version.set(saved.version);
      this.status.set('saved');
    } catch (error) {
      await this.handleFailure(error);
    } finally {
      this.inFlight = false;
    }
    if (this.pending) {
      this.pending = false;
      await this.saveNow();
    }
  }

  private async handleFailure(error: unknown): Promise<void> {
    if (!(error instanceof HttpErrorResponse)) {
      this.status.set('error');
      return;
    }
    if (error.status === 422) {
      applyProfileErrors(this.form, toProblem(error).errors ?? []);
      this.status.set('invalid');
      return;
    }
    if (error.status !== 409) {
      this.status.set('error');
      return;
    }
    this.status.set('conflict');
    const choice = await this.handlers.resolveConflict();
    const latest = await firstValueFrom(this.http.get<StoredProfile>('/api/profile'));
    if (choice === 'reload') {
      this.handlers.reload(latest);
      this.status.set('saved');
    } else {
      this.version.set(latest.version ?? 0);
      this.pending = true;
    }
  }
}
