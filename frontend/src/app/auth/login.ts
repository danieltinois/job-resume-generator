import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { Providers } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-form">
      <h1>{{ i18n.t('auth.login.title') }}</h1>
      <p class="subtitle">{{ i18n.t('auth.login.subtitle') }}</p>
      @if (expired()) {
        <p class="notice" role="status">{{ i18n.t('auth.expired') }}</p>
      }
      @if (error() === 'google') {
        <p class="notice error" role="alert">{{ i18n.t('auth.error.google') }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field>
          <mat-label>{{ i18n.t('auth.email') }}</mat-label>
          <input matInput name="email" type="email" autocomplete="email" formControlName="email" />
          <mat-error>{{ fieldError(form.controls.email, i18n) }}</mat-error>
        </mat-form-field>
        <div class="field">
          <mat-form-field>
            <mat-label>{{ i18n.t('auth.password') }}</mat-label>
            <input matInput name="password" type="password" autocomplete="current-password" formControlName="password" />
            <mat-error>{{ fieldError(form.controls.password, i18n) }}</mat-error>
          </mat-form-field>
          <a class="field-link" routerLink="/forgot-password">{{ i18n.t('auth.login.forgot') }}</a>
        </div>
        @if (message()) {
          <p class="notice error" role="alert">{{ message() }}</p>
        }
        @if (unverified()) {
          @if (resent()) {
            <p class="notice" role="status">{{ i18n.t('auth.resent') }}</p>
          } @else {
            <button mat-stroked-button class="full-width" type="button" data-test="resend" (click)="resend()">
              {{ i18n.t('auth.resend') }}
            </button>
          }
        }
        <button mat-flat-button class="full-width" type="submit" [disabled]="busy()">{{ i18n.t('auth.login.submit') }}</button>
      </form>
      @if (providers().google) {
        <p class="divider">{{ i18n.t('auth.login.or') }}</p>
        <a mat-stroked-button class="full-width" href="/oauth2/authorization/google">{{ i18n.t('auth.login.google') }}</a>
      }
      <p class="switch">
        {{ i18n.t('auth.login.newHere') }}
        <a routerLink="/register">{{ i18n.t('auth.login.noAccount') }}</a>
      </p>
    </div>
  `,
})
export class Login {
  /** Where to go after signing in (set by the auth guard). */
  readonly next = input<string>();
  /** "google" when Google sign-in failed. */
  readonly error = input<string>();
  /** Set when the session ran out. */
  readonly expired = input<string>();

  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly providers = toSignal(
    this.http.get<Providers>('/api/auth/providers').pipe(catchError(() => of({ google: false }))),
    { initialValue: { google: false } as Providers },
  );
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly message = signal<string | null>(null);
  protected readonly unverified = signal(false);
  protected readonly resent = signal(false);
  protected readonly busy = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    this.unverified.set(false);
    try {
      const { email, password } = this.form.getRawValue();
      await this.store.login(email, password);
      await this.router.navigateByUrl(this.next() || '/');
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.unverified.set(status === 403);
      this.message.set(
        this.i18n.t(
          status === 401
            ? 'auth.error.invalid'
            : status === 403
              ? 'auth.error.unverified'
              : status === 429
                ? 'auth.error.tooMany'
                : 'error.generic',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/auth/resend-verification', { email: this.form.controls.email.value }),
    );
    this.resent.set(true);
  }
}
