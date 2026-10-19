import { DOCUMENT, Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { en } from './en';
import { pt, type TranslationKey } from './pt';

export type UiLanguage = 'pt' | 'en';

export const BROWSER_LANGUAGE = new InjectionToken<string>('BROWSER_LANGUAGE', {
  providedIn: 'root',
  factory: () => (globalThis.navigator as Navigator | undefined)?.language ?? 'en',
});

const STORAGE_KEY = 'ui-lang';
const DICTIONARIES: Record<UiLanguage, Record<TranslationKey, string>> = { pt, en };

/**
 * UI strings in Portuguese or English, switchable at runtime. Starts from the
 * user's last choice, else the browser language. The choice is remembered
 * per browser only as a convenience.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<UiLanguage>(this.initial());

  constructor() {
    const document = inject(DOCUMENT);
    effect(() => (document.documentElement.lang = this.lang() === 'pt' ? 'pt-BR' : 'en'));
  }

  setLang(lang: UiLanguage): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage may be unavailable (private mode); the choice then lasts for this page only.
    }
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const text: string = DICTIONARIES[this.lang()][key];
    return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text;
  }

  private initial(): UiLanguage {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'pt' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore: fall back to the browser language
    }
    return inject(BROWSER_LANGUAGE).toLowerCase().startsWith('pt') ? 'pt' : 'en';
  }
}
