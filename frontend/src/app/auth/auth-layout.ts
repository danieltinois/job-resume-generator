import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterOutlet } from '@angular/router';
import { I18n } from '../core/i18n/i18n';
import type { TranslationKey } from '../core/i18n/pt';
import { Theme, type ThemeMode } from '../core/theme/theme';

const THEMES: { mode: ThemeMode; icon: string; label: TranslationKey }[] = [
  { mode: 'light', icon: 'light_mode', label: 'theme.light' },
  { mode: 'dark', icon: 'dark_mode', label: 'theme.dark' },
  { mode: 'system', icon: 'contrast', label: 'theme.system' },
];

const POINTS: TranslationKey[] = ['auth.brand.profile', 'auth.brand.match', 'auth.brand.facts'];

/** Split screen for the sign-in and account pages: a dark brand panel, and the form with its switches. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, MatButtonToggleModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" data-test="brand-panel">
      <div class="brand">
        <span class="mark" aria-hidden="true">RT</span>
        <span>Resume Tailor</span>
      </div>
      <div>
        <p class="promise">{{ i18n.t('auth.brand.promise') }}</p>
        <ul>
          @for (point of points; track point) {
            <li>
              <mat-icon aria-hidden="true">check_circle</mat-icon>
              <span>{{ i18n.t(point) }}</span>
            </li>
          }
        </ul>
      </div>
    </div>

    <div class="side">
      <div class="switches">
        <mat-button-toggle-group
          hideSingleSelectionIndicator
          [value]="i18n.lang()"
          (change)="i18n.setLang($event.value)"
          [attr.aria-label]="i18n.t('nav.language')"
        >
          <mat-button-toggle value="pt" data-test="lang-pt">PT</mat-button-toggle>
          <mat-button-toggle value="en" data-test="lang-en">EN</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-button-toggle-group
          hideSingleSelectionIndicator
          [value]="theme.mode()"
          (change)="theme.set($event.value)"
          [attr.aria-label]="i18n.t('theme.label')"
        >
          @for (option of themes; track option.mode) {
            <mat-button-toggle
              [value]="option.mode"
              [attr.data-test]="'theme-' + option.mode"
              [aria-label]="i18n.t(option.label)"
              [matTooltip]="i18n.t(option.label)"
            >
              <mat-icon aria-hidden="true">{{ option.icon }}</mat-icon>
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </div>
      <main class="form">
        <div class="compact-brand" aria-hidden="true">
          <span class="mark">RT</span>
          <span>Resume Tailor</span>
        </div>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
      min-height: 100vh;
    }
    /* The panel reads the same in both themes, so its colours are fixed (the dark theme's values). */
    .panel {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 48px;
      padding: 40px 48px;
      background-color: #09090b;
      background-image: radial-gradient(rgba(52, 211, 153, 0.16) 1px, transparent 1px);
      background-size: 22px 22px;
      color: #fafafa;
    }
    .brand,
    .compact-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #34d399;
      color: #022c22;
      font-size: 12px;
    }
    .promise {
      max-width: 22ch;
      margin: 0 0 24px;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }
    ul {
      display: grid;
      gap: 12px;
      margin: 0 0 24px;
      padding: 0;
      list-style: none;
      color: #d4d4d8;
    }
    li {
      display: flex;
      gap: 10px;
    }
    li mat-icon {
      flex: none;
      color: #34d399;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .side {
      display: flex;
      flex-direction: column;
      padding: 16px;
    }
    .switches {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .form {
      width: 100%;
      max-width: 360px;
      margin: auto;
      padding: 32px 0;
    }
    .compact-brand {
      display: none;
      margin-bottom: 24px;
    }
    .compact-brand .mark {
      background: var(--app-accent);
      color: var(--app-on-accent);
    }
    @media (max-width: 767.98px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }
      .panel {
        display: none;
      }
      .compact-brand {
        display: flex;
      }
    }
  `,
})
export class AuthLayout {
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(Theme);
  protected readonly themes = THEMES;
  protected readonly points = POINTS;
}
