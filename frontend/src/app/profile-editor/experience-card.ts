import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { TechTerm } from '../core/api/types';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';
import { AchievementList } from './achievement-list';
import { type EditLanguage, LocalizedField } from './localized-field';
import type { ExperienceForm } from './profile-form';

/**
 * One job. Collapsed it is a one-line summary with no form controls in the
 * DOM, so a long profile stays fast to type in; only the open card renders
 * its fields.
 */
@Component({
  selector: 'app-experience-card',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, LocalizedField, AchievementList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" [class.open]="expanded()">
      <header>
        <button class="summary" type="button" [attr.aria-expanded]="expanded()" (click)="expandToggle.emit()">
          <strong>{{ experience().controls.company.value || i18n.t('profile.untitled') }}</strong>
          · {{ experience().controls.role.controls[mode()].value || experience().controls.role.controls.pt.value }}
          · {{ period() }}
        </button>
        <button mat-icon-button type="button" [attr.aria-label]="i18n.t('common.remove')" (click)="remove.emit()">✕</button>
      </header>
      @if (expanded()) {
        <div class="fields">
          <mat-form-field>
            <mat-label>{{ i18n.t('profile.field.company') }}</mat-label>
            <input matInput name="company" [formControl]="experience().controls.company" />
            <mat-error>{{ fieldError(experience().controls.company, i18n) }}</mat-error>
          </mat-form-field>
          <app-localized-field [group]="experience().controls.role" [mode]="mode()" [label]="i18n.t('profile.field.role')" />
          <div class="dates">
            <mat-form-field>
              <mat-label>{{ i18n.t('profile.field.start') }}</mat-label>
              <input matInput name="startDate" placeholder="2023-02" [formControl]="experience().controls.startDate" />
              <mat-error>{{ fieldError(experience().controls.startDate, i18n) }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ i18n.t('profile.field.end') }}</mat-label>
              <input matInput name="endDate" placeholder="2024-06" [formControl]="experience().controls.endDate" />
              <mat-error>{{ fieldError(experience().controls.endDate, i18n) }}</mat-error>
            </mat-form-field>
          </div>
          <app-achievement-list
            [achievements]="experience().controls.achievements"
            [mode]="mode()"
            [suggestions]="suggestions()"
            [terms]="terms()"
          />
        </div>
      }
    </section>
  `,
  styles: `
    .card {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      margin-bottom: 12px;
      padding: 4px 12px;
    }
    header {
      display: flex;
      align-items: center;
    }
    .summary {
      flex: 1;
      text-align: left;
      background: none;
      border: 0;
      padding: 12px 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .dates {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fields {
      display: flex;
      flex-direction: column;
      padding-bottom: 12px;
    }
  `,
})
export class ExperienceCard {
  readonly experience = input.required<ExperienceForm>();
  readonly mode = input.required<EditLanguage>();
  readonly expanded = input.required<boolean>();
  readonly suggestions = input<string[]>([]);
  readonly terms = input<TechTerm[]>([]);
  readonly expandToggle = output<void>();
  readonly remove = output<void>();

  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;

  protected period(): string {
    const { startDate, endDate } = this.experience().controls;
    return `${startDate.value} – ${endDate.value || this.i18n.t('common.current')}`;
  }
}
