import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { I18n } from '../core/i18n/i18n';

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel: string;
  /** Styles the confirm button in the danger colour. */
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    @if (data.text) {
      <mat-dialog-content>{{ data.text }}</mat-dialog-content>
    }
    <mat-dialog-actions align="end">
      <button mat-button type="button" data-test="cancel" [mat-dialog-close]="false">
        {{ i18n.t('common.cancel') }}
      </button>
      <button
        mat-flat-button
        type="button"
        data-test="confirm"
        [class.danger]="data.destructive"
        [mat-dialog-close]="true"
      >
        {{ data.confirmLabel || i18n.t('common.confirm') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      color: var(--app-muted);
    }
    .danger {
      --mat-button-filled-container-color: var(--app-danger);
      --mat-button-filled-label-text-color: var(--app-surface);
    }
  `,
})
export class ConfirmDialogView {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}

/** Replaces `window.confirm`. Escape, a backdrop click and Cancel all resolve `false`. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialog {
  private readonly dialog = inject(MatDialog);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialogView, ConfirmOptions, boolean>(ConfirmDialogView, {
      data: options,
      width: '420px',
      maxWidth: '92vw',
    });
    return (await firstValueFrom(ref.afterClosed(), { defaultValue: false })) === true;
  }
}
