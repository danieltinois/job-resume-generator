import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { StoredJob } from '../core/api/types';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';
import { Shortcuts } from '../core/shortcuts/shortcuts';
import { Kbd } from '../ui/kbd';
import { PageHeader } from '../ui/page-header';

const MAX_DESCRIPTION = 50_000;

@Component({
  selector: 'app-new-job',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PageHeader, Kbd],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header [title]="i18n.t('newJob.title')" [subtitle]="i18n.t('newJob.help')" />
      <div class="columns">
        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field class="full-width">
            <mat-label>{{ i18n.t('newJob.description') }}</mat-label>
            <textarea matInput name="description" rows="18" formControlName="description"></textarea>
            <mat-hint align="end">{{ form.controls.description.value.length }} / {{ max }}</mat-hint>
            <mat-error>{{ fieldError(form.controls.description, i18n) }}</mat-error>
          </mat-form-field>
          <div class="submit-row">
            <button mat-flat-button type="submit" [disabled]="busy()">{{ i18n.t('newJob.submit') }}</button>
            <span class="shortcut"><app-kbd keys="Mod+Enter" /> {{ i18n.t('newJob.shortcut') }}</span>
          </div>
        </form>
        <aside class="card next">
          <h2>{{ i18n.t('newJob.next.title') }}</h2>
          <ol>
            <li>{{ i18n.t('newJob.next.read') }}</li>
            <li>{{ i18n.t('newJob.next.match') }}</li>
            <li>{{ i18n.t('newJob.next.review') }}</li>
          </ol>
        </aside>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .page {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .columns {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 24px;
      align-items: start;
    }
    .card {
      box-sizing: border-box;
      padding: 20px;
      border: 1px solid var(--app-border);
      border-radius: 12px;
      background: var(--app-surface);
    }
    .full-width {
      width: 100%;
    }
    .submit-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-top: 8px;
    }
    .shortcut {
      color: var(--app-muted);
      font-size: 13px;
    }
    .next h2 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: var(--app-text);
    }
    .next ol {
      margin: 0;
      padding-left: 20px;
      color: var(--app-muted);
      line-height: 1.5;
    }
    .next li + li {
      margin-top: 12px;
    }
    @media (max-width: 767px) {
      .page {
        padding: 24px 16px;
      }
      .columns {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class NewJob {
  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  protected readonly max = MAX_DESCRIPTION;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_DESCRIPTION)],
    }),
  });
  protected readonly busy = signal(false);

  constructor() {
    inject(Shortcuts).register(
      { key: 'Enter', mod: true, description: 'shortcuts.analyze', handler: () => void this.submit() },
      inject(DestroyRef),
    );
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.form.invalid || !this.form.controls.description.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const job = await firstValueFrom(this.http.post<StoredJob>('/api/jobs', this.form.getRawValue()));
      await this.router.navigate(['/jobs', job.id, 'review']);
    } finally {
      this.busy.set(false);
    }
  }
}
