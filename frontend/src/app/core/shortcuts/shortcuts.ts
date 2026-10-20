import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, type Signal, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { TranslationKey } from '../i18n/pt';

export interface Shortcut {
  /** The key as `KeyboardEvent.key` reports it, compared case-insensitively. */
  key: string;
  /** Requires Ctrl or Cmd. Without it the shortcut is a plain key. */
  mod?: boolean;
  description: TranslationKey;
  handler: () => void;
}

const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * The one keyboard listener of the app. Components register shortcuts for as long as they live.
 * Plain keys stay out of the way while the user types or a dialog is open; Ctrl/Cmd combinations do not.
 */
@Injectable({ providedIn: 'root' })
export class Shortcuts {
  private readonly dialog = inject(MatDialog);
  private readonly registered = signal<Shortcut[]>([]);

  /** The shortcuts of the components that are alive right now. */
  readonly active: Signal<Shortcut[]> = this.registered.asReadonly();

  constructor() {
    const document = inject(DOCUMENT);
    const listener = (event: KeyboardEvent) => this.onKeydown(event);
    document.addEventListener('keydown', listener);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', listener));
  }

  register(shortcut: Shortcut, destroyRef: DestroyRef): void {
    this.registered.update((all) => [...all, shortcut]);
    destroyRef.onDestroy(() => this.registered.update((all) => all.filter((entry) => entry !== shortcut)));
  }

  private onKeydown(event: KeyboardEvent): void {
    // Browser autofill dispatches plain `Event`s named keydown, with no `key`.
    if (typeof event.key !== 'string') {
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const match = this.registered().find(
      (shortcut) => shortcut.key.toLowerCase() === key && !!shortcut.mod === mod && (mod || !event.altKey),
    );
    if (!match || (!match.mod && this.plainKeysBlocked(event))) {
      return;
    }
    event.preventDefault();
    match.handler();
  }

  private plainKeysBlocked(event: KeyboardEvent): boolean {
    const target = event.target;
    return (target instanceof Element && target.closest(TYPING) !== null) || this.dialog.openDialogs.length > 0;
  }
}
