import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { fieldErrors, toProblem } from '../core/api/problem';
import { fieldError } from '../core/forms/field-error';
import { applyServerErrors, maxBytes } from '../core/forms/validators';
import { I18n } from '../core/i18n/i18n';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card">
      <h1>{{ i18n.t('auth.register.title') }}</h1>
      @if (done()) {
        <p class="notice" role="status">{{ i18n.t('auth.register.done') }}</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field>
            <mat-label>{{ i18n.t('auth.name') }}</mat-label>
            <input matInput name="name" autocomplete="name" formControlName="name" />
            <mat-error>{{ fieldError(form.controls.name, i18n) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ i18n.t('auth.email') }}</mat-label>
            <input matInput name="email" type="email" autocomplete="email" formControlName="email" />
            <mat-error>{{ fieldError(form.controls.email, i18n) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ i18n.t('auth.password') }}</mat-label>
            <input matInput name="password" type="password" autocomplete="new-password" formControlName="password" />
            <mat-error>{{ fieldError(form.controls.password, i18n) }}</mat-error>
          </mat-form-field>
          @if (message()) {
            <p class="notice error" role="alert">{{ message() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="busy()">{{ i18n.t('auth.register.submit') }}</button>
        </form>
      }
      <nav class="links">
        <a routerLink="/login">{{ i18n.t('auth.register.haveAccount') }}</a>
      </nav>
    </mat-card>
  `,
})
export class Register {
  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8), maxBytes(72)],
    }),
  });
  protected readonly done = signal(false);
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      await firstValueFrom(this.http.post('/api/auth/register', this.form.getRawValue()));
      this.done.set(true);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) {
        throw error;
      }
      if (error.status === 409) {
        this.form.controls.email.setErrors({ taken: true });
        this.form.controls.email.markAsTouched();
      } else if (error.status === 422) {
        applyServerErrors(this.form, fieldErrors(toProblem(error)));
      } else {
        this.message.set(this.i18n.t('error.generic'));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
