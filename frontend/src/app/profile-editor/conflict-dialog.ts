import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { I18n } from '../core/i18n/i18n';
import type { ConflictChoice } from './autosave';

/** The profile was saved elsewhere (another tab) while this one had unsaved edits. */
@Component({
  selector: 'app-conflict-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ i18n.t('profile.conflict.title') }}</h2>
    <mat-dialog-content>{{ i18n.t('profile.conflict.body') }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" data-test="reload" (click)="close('reload')">
        {{ i18n.t('profile.conflict.reload') }}
      </button>
      <button mat-flat-button type="button" data-test="keep" (click)="close('keep')">
        {{ i18n.t('profile.conflict.keep') }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConflictDialog {
  protected readonly i18n = inject(I18n);
  private readonly dialog = inject<MatDialogRef<ConflictDialog, ConflictChoice>>(MatDialogRef);

  protected close(choice: ConflictChoice): void {
    this.dialog.close(choice);
  }
}
