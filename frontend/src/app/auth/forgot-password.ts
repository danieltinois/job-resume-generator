import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card">
      <h1>{{ i18n.t('auth.forgot.title') }}</h1>
      @if (sent()) {
        <p class="notice" role="status">{{ i18n.t('auth.forgot.sent') }}</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field>
            <mat-label>{{ i18n.t('auth.email') }}</mat-label>
            <input matInput name="email" type="email" autocomplete="email" formControlName="email" />
            <mat-error>{{ fieldError(form.controls.email, i18n) }}</mat-error>
          </mat-form-field>
          <button mat-flat-button type="submit">{{ i18n.t('auth.forgot.submit') }}</button>
        </form>
      }
      <nav class="links">
        <a routerLink="/login">{{ i18n.t('auth.back') }}</a>
      </nav>
    </mat-card>
  `,
})
export class ForgotPassword {
  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  protected readonly sent = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // The answer is the same whether or not the account exists, by design.
    await firstValueFrom(this.http.post('/api/auth/forgot-password', this.form.getRawValue())).catch(() => null);
    this.sent.set(true);
  }
}
