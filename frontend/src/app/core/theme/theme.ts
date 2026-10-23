import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ui-theme';
const COLOR_SCHEME: Record<ThemeMode, string> = { light: 'light', dark: 'dark', system: 'light dark' };
/** The browser bar colour of each scheme: the `--app-bg` values, which a <meta> cannot read from CSS. */
const BAR_COLOR = { light: '#fafafa', dark: '#09090b' };

/**
 * Light, dark or system colour scheme. Starts from the user's last choice,
 * else follows the system. The choice is remembered per browser only as a
 * convenience. The inline color-scheme overrides the stylesheet default so
 * that native controls match the chosen theme, and the `theme-color` metas
 * follow the explicit choice so the browser bar does too.
 *
 * It is applied once on creation, not only when the effect first runs, so the
 * saved choice is on the page before the first render.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document: Document;
  readonly mode = signal<ThemeMode>(this.initial());

  constructor() {
    this.document = inject(DOCUMENT);
    this.apply(this.mode());
    effect(() => this.apply(this.mode()));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable (private mode); the choice then lasts for this page only.
    }
  }

  private apply(mode: ThemeMode): void {
    this.document.documentElement.style.colorScheme = COLOR_SCHEME[mode];
    // index.html has one meta per scheme, each behind a prefers-color-scheme media query. For `system` each
    // keeps its own colour; an explicit choice sets both to the chosen one, so whichever matches shows it.
    for (const meta of Array.from(this.document.querySelectorAll('meta[name="theme-color"]'))) {
      const own = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light';
      meta.setAttribute('content', BAR_COLOR[mode === 'system' ? own : mode]);
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
