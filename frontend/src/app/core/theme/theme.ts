import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ui-theme';
const COLOR_SCHEME: Record<ThemeMode, string> = { light: 'light', dark: 'dark', system: 'light dark' };

/**
 * Light, dark or system colour scheme. Starts from the user's last choice,
 * else follows the system. The choice is remembered per browser only as a
 * convenience. The inline color-scheme overrides the stylesheet default so
 * that native controls match the chosen theme.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  readonly mode = signal<ThemeMode>(this.initial());

  constructor() {
    const document = inject(DOCUMENT);
    effect(() => {
      document.documentElement.style.colorScheme = COLOR_SCHEME[this.mode()];
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable (private mode); the choice then lasts for this page only.
    }
  }

  private initial(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // ignore: fall back to the system setting
    }
    return 'system';
  }
}
