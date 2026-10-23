import { TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';
import type { LocalizedForm } from './profile-form';

export type EditLanguage = 'pt' | 'en';

/**
 * One bilingual text field, showing the language being edited. In English
 * mode the Portuguese text sits underneath as the reference to translate.
 */
@Component({
  selector: 'app-localized-field',
  imports: [ReactiveFormsModule, TextFieldModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width">
      <mat-label>{{ label() }} ({{ mode().toUpperCase() }})</mat-label>
      @if (multiline()) {
        <textarea
          matInput
          cdkTextareaAutosize
          cdkAutosizeMinRows="2"
          [formControl]="control()"
          [attr.name]="name()"
          (keydown.enter)="onEnter($any($event))"
        ></textarea>
      } @else {
        <input matInput [formControl]="control()" [attr.name]="name()" />
      }
      <mat-error>{{ fieldError(control(), i18n) }}</mat-error>
    </mat-form-field>
    @if (mode() === 'en') {
      <p class="reference">
        <span>{{ i18n.t('profile.ptReference') }}</span> {{ group().controls.pt.value }}
      </p>
    }
  `,
  styles: `
    /* Outlined fields have no reserved error line (dynamic subscript), so each one carries its own gap. */
    mat-form-field {
      margin-bottom: 16px;
    }
    .reference {
      margin: -8px 0 16px;
      font-size: 13px;
      color: var(--app-muted);
    }
  `,
})
export class LocalizedField {
  readonly group = input.required<LocalizedForm>();
  readonly mode = input.required<EditLanguage>();
  readonly label = input.required<string>();
  readonly multiline = input(false);
  readonly name = input<string>();
  /** Enter pressed with the caret at the end of a multiline field. */
  readonly enterAtEnd = output<void>();

  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  protected readonly control = computed(() => this.group().controls[this.mode()]);

  protected onEnter(event: KeyboardEvent): void {
    const field = event.target as HTMLTextAreaElement;
    if (!event.shiftKey && field.selectionStart === field.value.length) {
      event.preventDefault();
      this.enterAtEnd.emit();
    }
  }
}
