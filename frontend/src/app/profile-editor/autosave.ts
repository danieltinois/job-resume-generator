import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { Subscription, debounceTime, firstValueFrom } from 'rxjs';
import { toProblem } from '../core/api/problem';
import type { StoredProfile } from '../core/api/types';
import { type ProfileForm, applyProfileErrors, toProfile } from './profile-form';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'invalid' | 'error' | 'conflict';
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
 * its own; the user decides. Leaving the page flushes what is pending.
 */
export class Autosave {
  readonly status = signal<SaveStatus>('idle');

  private subscription: Subscription | null = null;
  /** The save under way, including the follow-up saves it triggers. */
  private running: Promise<void> | null = null;
  private pending = false;
  /** Edits made since the last save started. */
  private dirty = false;

  constructor(
    private readonly http: HttpClient,
    private readonly form: ProfileForm,
    private readonly version: WritableSignal<number>,
    private readonly handlers: AutosaveHandlers,
  ) {}

  start(): void {
    this.subscription = this.form.valueChanges.subscribe(() => {
      this.dirty = true;
      if (!this.running) {
        this.status.set('unsaved');
      }
    });
    this.subscription.add(
      this.form.valueChanges.pipe(debounceTime(AUTOSAVE_DELAY_MS)).subscribe(() => {
        if (this.dirty) {
          void this.saveNow();
        }
      }),
    );
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  /** True while some edit is not on the server yet: typed, being saved, or rejected. */
  hasUnsavedChanges(): boolean {
    return this.dirty || this.running !== null;
  }

  /** Saves pending edits now, without waiting for the pause, and settles once nothing is in flight. */
  async flush(): Promise<void> {
    if (this.running) {
      await this.running;
    }
    if (this.dirty) {
      await this.saveNow();
    }
  }

  saveNow(): Promise<void> {
    if (this.running) {
      this.pending = true;
      return this.running;
    }
    this.running = this.saveUntilCurrent().finally(() => (this.running = null));
    return this.running;
  }

  private async saveUntilCurrent(): Promise<void> {
    do {
      this.pending = false;
      await this.saveOnce();
    } while (this.pending);
  }

  private async saveOnce(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set('invalid');
      return;
    }
    this.dirty = false;
    this.status.set('saving');
    try {
      const saved = await firstValueFrom(
        this.http.put<{ version: number }>('/api/profile', { version: this.version(), data: toProfile(this.form) }),
      );
      this.version.set(saved.version);
      this.status.set(this.dirty ? 'unsaved' : 'saved');
    } catch (error) {
      this.dirty = true;
      await this.handleFailure(error);
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
      this.dirty = false;
      this.handlers.reload(latest);
      this.status.set('saved');
    } else {
      this.version.set(latest.version ?? 0);
      this.pending = true;
    }
  }
}
