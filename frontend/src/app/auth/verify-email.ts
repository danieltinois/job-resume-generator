import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18n } from '../core/i18n/i18n';

/** Landing page of the verification email: /verify-email?token=… */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card">
      @switch (state()) {
        @case ('pending') {
          <p role="status">{{ i18n.t('auth.verify.pending') }}</p>
        }
        @case ('done') {
          <p class="notice" role="status">{{ i18n.t('auth.verify.done') }}</p>
        }
        @case ('failed') {
          <p class="notice error" role="alert">{{ i18n.t('auth.link.invalid') }}</p>
        }
      }
      <nav class="links">
        <a routerLink="/login">{{ i18n.t('auth.back') }}</a>
      </nav>
    </mat-card>
  `,
})
export class VerifyEmail implements OnInit {
  readonly token = input<string>();

  protected readonly i18n = inject(I18n);
  private readonly http = inject(HttpClient);
  protected readonly state = signal<'pending' | 'done' | 'failed'>('pending');

  async ngOnInit(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/verify-email', { token: this.token() ?? '' }));
      this.state.set('done');
    } catch {
      this.state.set('failed');
    }
  }
}
