import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { SIGNING_OUT } from '../core/auth/auth.guard';
import { AuthStore } from '../core/auth/auth-store';
import { I18n, type UiLanguage } from '../core/i18n/i18n';
import type { TranslationKey } from '../core/i18n/pt';
import { ShortcutsDialog } from '../core/shortcuts/shortcuts-dialog';
import { Theme, type ThemeMode } from '../core/theme/theme';

const THEMES: { mode: ThemeMode; icon: string; label: TranslationKey }[] = [
  { mode: 'light', icon: 'light_mode', label: 'theme.light' },
  { mode: 'dark', icon: 'dark_mode', label: 'theme.dark' },
  { mode: 'system', icon: 'contrast', label: 'theme.system' },
];

/** Each language is named in itself, so it reads the same whichever language the UI is in. */
const LANGUAGES: { lang: UiLanguage; label: string; htmlLang: string }[] = [
  { lang: 'pt', label: 'Português', htmlLang: 'pt-BR' },
  { lang: 'en', label: 'English', htmlLang: 'en' },
];

/** The signed-in user's button at the foot of the sidebar, with theme, language, shortcuts and sign-out. */
@Component({
  selector: 'app-user-menu',
  imports: [MatMenuModule, MatIconModule, MatDividerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="trigger"
      [class.compact]="compact()"
      [matMenuTriggerFor]="menu"
      [matTooltip]="name()"
      [matTooltipDisabled]="!compact()"
      matTooltipPosition="right"
    >
      <span class="avatar" aria-hidden="true">{{ initials() }}</span>
      <span class="who" [class.visually-hidden]="compact()">
        <span class="name">{{ name() }}</span>
        <span class="email">{{ auth.user()?.email }}</span>
      </span>
      @if (!compact()) {
        <mat-icon class="chevron" aria-hidden="true">unfold_more</mat-icon>
      }
    </button>

    <mat-menu #menu="matMenu" yPosition="above">
      <div role="group" [attr.aria-label]="i18n.t('theme.label')">
        <div class="heading" aria-hidden="true">{{ i18n.t('theme.label') }}</div>
        @for (option of themes; track option.mode) {
          <button
            mat-menu-item
            role="menuitemradio"
            [attr.aria-checked]="theme.mode() === option.mode"
            (click)="theme.set(option.mode)"
          >
            <mat-icon aria-hidden="true">{{ option.icon }}</mat-icon>
            <span class="option">
              {{ i18n.t(option.label) }}
              @if (theme.mode() === option.mode) {
                <mat-icon class="check" aria-hidden="true">check</mat-icon>
              }
            </span>
          </button>
        }
      </div>
      <mat-divider />
      <div role="group" [attr.aria-label]="i18n.t('nav.language')">
        <div class="heading" aria-hidden="true">{{ i18n.t('nav.language') }}</div>
        @for (option of languages; track option.lang) {
          <button
            mat-menu-item
            role="menuitemradio"
            [attr.aria-checked]="i18n.lang() === option.lang"
            (click)="i18n.setLang(option.lang)"
          >
            <mat-icon aria-hidden="true">translate</mat-icon>
            <span class="option">
              <span [attr.lang]="option.htmlLang">{{ option.label }}</span>
              @if (i18n.lang() === option.lang) {
                <mat-icon class="check" aria-hidden="true">check</mat-icon>
              }
            </span>
          </button>
        }
      </div>
      <mat-divider />
      <button mat-menu-item (click)="openShortcuts()">
        <mat-icon aria-hidden="true">keyboard</mat-icon>
        <span>{{ i18n.t('nav.shortcuts') }}</span>
      </button>
      <button mat-menu-item data-test="sign-out" (click)="signOut()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        <span>{{ i18n.t('nav.logout') }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    :host {
      display: block;
    }
    .trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      color: var(--app-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: background-color 150ms ease;
    }
    .trigger:hover {
      background: var(--app-subtle);
    }
    .trigger.compact {
      justify-content: center;
      padding: 3px;
    }
    .avatar {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: var(--app-accent-soft);
      color: var(--app-on-accent-soft);
      font-size: 12px;
      font-weight: 600;
    }
    .who {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
      line-height: 1.3;
    }
    .name,
    .email {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name {
      font-weight: 500;
    }
    .email {
      color: var(--app-muted);
      font-size: 12px;
    }
    .heading {
      padding: 8px 16px 4px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 500;
    }
    .option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      min-width: 120px;
    }
    .check {
      color: var(--app-accent);
    }
    .chevron {
      flex: none;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--app-muted);
    }
  `,
})
export class UserMenu {
  /** The sidebar is a rail: show only the avatar. */
  readonly compact = input(false);

  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(Theme);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;

  protected readonly name = computed(() => this.auth.user()?.name || this.auth.user()?.email || '');
  protected readonly initials = computed(() => {
    const words = this.name().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);
    return letters.toUpperCase();
  });

  protected openShortcuts(): void {
    this.dialog.open(ShortcutsDialog);
  }

  protected async signOut(): Promise<void> {
    // Leave the page first, so the profile editor can save pending edits while the session still holds.
    if (await this.router.navigateByUrl('/login', { state: { [SIGNING_OUT]: true } })) {
      await this.auth.logout();
    }
  }
}
