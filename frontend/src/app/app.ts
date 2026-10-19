import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SIGNING_OUT } from './core/auth/auth.guard';
import { AuthStore } from './core/auth/auth-store';
import { I18n } from './core/i18n/i18n';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatButtonToggleModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    // Leave the page first, so the profile editor can save pending edits while the session still holds.
    if (await this.router.navigateByUrl('/login', { state: { [SIGNING_OUT]: true } })) {
      await this.auth.logout();
    }
  }
}
