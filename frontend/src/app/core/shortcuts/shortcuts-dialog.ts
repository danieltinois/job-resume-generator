import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Kbd } from '../../ui/kbd';
import { I18n } from '../i18n/i18n';
import type { TranslationKey } from '../i18n/pt';
import { Shortcuts } from './shortcuts';

interface Row {
  keys: string;
  description: TranslationKey;
}

/** `s` with Mod reads `Mod+S`; `Enter` stays `Enter`. */
function keysOf(key: string, mod: boolean | undefined): string {
  const label = key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
  return mod ? `Mod+${label}` : label;
}

/** Lists the shortcuts available on the current page, plus the global help key. */
@Component({
  selector: 'app-shortcuts-dialog',
  imports: [MatDialogModule, MatButtonModule, Kbd],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ i18n.t('shortcuts.title') }}</h2>
    <mat-dialog-content>
      <ul>
        @for (row of rows(); track row.keys) {
          <li>
            <span>{{ i18n.t(row.description) }}</span>
            <app-kbd [keys]="row.keys" />
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" data-test="close" mat-dialog-close>{{ i18n.t('common.close') }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--app-border);
    }
    li:last-child {
      border-bottom: 0;
    }
  `,
})
export class ShortcutsDialog {
  protected readonly i18n = inject(I18n);
  private readonly shortcuts = inject(Shortcuts);

  protected readonly rows = computed<Row[]>(() => [
    ...this.shortcuts
      .active()
      .filter((shortcut) => shortcut.key !== '?')
      .map((shortcut) => ({ keys: keysOf(shortcut.key, shortcut.mod), description: shortcut.description })),
    { keys: '?', description: 'shortcuts.help' },
  ]);
}
