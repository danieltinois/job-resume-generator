import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { StoredJob } from '../core/api/types';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';

const MAX_DESCRIPTION = 50_000;

@Component({
  selector: 'app-new-job',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>{{ i18n.t('newJob.title') }}</h1>
      <p>{{ i18n.t('newJob.help') }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field class="full-width">
          <mat-label>{{ i18n.t('newJob.description') }}</mat-label>
          <textarea matInput name="description" rows="18" formControlName="description"></textarea>
          <mat-hint align="end">{{ form.controls.description.value.length }} / {{ max }}</mat-hint>
          <mat-error>{{ fieldError(form.controls.description, i18n) }}</mat-error>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="busy()">{{ i18n.t('newJob.submit') }}</button>
      </form>
    </div>
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
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

  async submit(): Promise<void> {
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
