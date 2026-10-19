import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { fieldError } from '../core/forms/field-error';
import { maxBytes } from '../core/forms/validators';
import { I18n } from '../core/i18n/i18n';

/** Landing page of the reset email: /reset-password?token=… */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card">
      <h1>{{ i18n.t('auth.reset.title') }}</h1>
      @switch (state()) {
        @case ('done') {
          <p class="notice" role="status">{{ i18n.t('auth.reset.done') }}</p>
        }
        @case ('failed') {
          <p class="notice error" role="alert">{{ i18n.t('auth.link.invalid') }}</p>
        }
        @default {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>{{ i18n.t('auth.password') }}</mat-label>
              <input matInput name="password" type="password" autocomplete="new-password" formControlName="password" />
              <mat-error>{{ fieldError(form.controls.password, i18n) }}</mat-error>
            </mat-form-field>
            <button mat-flat-button type="submit">{{ i18n.t('auth.reset.submit') }}</button>
          </form>
        }
      }
      <nav class="links">
        <a routerLink="/login">{{ i18n.t('auth.back') }}</a>
      </nav>
    </mat-card>
  `,
})
export class ResetPassword {
  readonly token = input<string>();

  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8), maxBytes(72)],
    }),
  });
  protected readonly state = signal<'form' | 'done' | 'failed'>('form');

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      await firstValueFrom(
        this.http.post('/api/auth/reset-password', { token: this.token() ?? '', password: this.form.controls.password.value }),
      );
      this.state.set('done');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        this.state.set('failed');
      } else {
        throw error;
      }
    }
  }
}
