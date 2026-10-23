import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { toProblem } from '../core/api/problem';
import type { Profile } from '../core/api/types';
import { I18n } from '../core/i18n/i18n';

/**
 * Converts the profile.yaml of the old command line tool. The result is
 * only a preview until the user confirms it replaces the current profile.
 */
@Component({
  selector: 'app-import-dialog',
  imports: [MatDialogModule, MatButtonModule, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ i18n.t('profile.import.title') }}</h2>
    <mat-dialog-content>
      @if (converted(); as profile) {
        <p>{{ i18n.t('profile.import.preview', { experiences: counts().experiences, achievements: counts().achievements }) }}</p>
        <p>{{ i18n.t('profile.import.warning') }}</p>
      } @else {
        <p>{{ i18n.t('profile.import.help') }}</p>
        <label class="file">
          <span>{{ i18n.t('profile.import.file') }}</span>
          <input type="file" accept=".yaml,.yml" (change)="pick($event)" />
        </label>
        <p id="import-language">{{ i18n.t('profile.import.language') }}</p>
        <mat-button-toggle-group aria-labelledby="import-language" [value]="language()" (change)="language.set($event.value)">
          <mat-button-toggle value="pt">PT</mat-button-toggle>
          <mat-button-toggle value="en">EN</mat-button-toggle>
        </mat-button-toggle-group>
        @if (error()) {
          <p class="notice error" role="alert">{{ error() }}</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialog.close()">{{ i18n.t('common.cancel') }}</button>
      @if (converted(); as profile) {
        <button mat-flat-button type="button" data-test="replace" (click)="dialog.close(profile)">
          {{ i18n.t('profile.import.replace') }}
        </button>
      } @else {
        <button mat-flat-button type="button" [disabled]="!file()" (click)="convert()">
          {{ i18n.t('profile.import.convert') }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      color: var(--app-muted);
    }
    p {
      margin: 0 0 12px;
    }
    .file {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      color: var(--app-text);
    }
    #import-language {
      color: var(--app-text);
    }
  `,
})
export class ImportDialog {
  protected readonly i18n = inject(I18n);
  protected readonly dialog = inject<MatDialogRef<ImportDialog, Profile>>(MatDialogRef);
  private readonly http = inject(HttpClient);

  readonly file = signal<File | null>(null);
  readonly language = signal<'pt' | 'en'>('pt');
  protected readonly converted = signal<Profile | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly counts = computed(() => {
    const experiences = this.converted()?.experiences ?? [];
    return {
      experiences: experiences.length,
      achievements: experiences.reduce((total, experience) => total + (experience.achievements?.length ?? 0), 0),
    };
  });

  choose(file: File | null): void {
    this.file.set(file);
    this.error.set(null);
  }

  protected pick(event: Event): void {
    this.choose((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  async convert(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    const body = new FormData();
    body.append('file', file);
    body.append('language', this.language());
    try {
      this.converted.set(await firstValueFrom(this.http.post<Profile>('/api/profile/import', body)));
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 422
          ? (toProblem(error).detail ?? this.i18n.t('error.generic'))
          : this.i18n.t('error.generic'),
      );
    }
  }
}
