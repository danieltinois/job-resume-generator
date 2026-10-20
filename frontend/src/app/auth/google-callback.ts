import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { I18n } from '../core/i18n/i18n';

/**
 * Where the backend sends the browser after Google sign-in. The refresh
 * cookie is already set; exchanging it for an access token finishes sign-in.
 */
@Component({
  selector: 'app-google-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-form">
      <p class="notice" role="status">{{ i18n.t('auth.callback') }}</p>
    </div>
  `,
})
export class GoogleCallback implements OnInit {
  protected readonly i18n = inject(I18n);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.store.restore();
    await this.router.navigateByUrl(this.store.isSignedIn() ? '/' : '/login?error=google');
  }
}
