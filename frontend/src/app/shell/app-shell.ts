import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { I18n } from '../core/i18n/i18n';
import type { TranslationKey } from '../core/i18n/pt';
import { Shortcuts } from '../core/shortcuts/shortcuts';
import { ShortcutsDialog } from '../core/shortcuts/shortcuts-dialog';
import { UserMenu } from './user-menu';

export const DESKTOP = '(min-width: 1024px)';
export const TABLET = '(min-width: 768px)';

/** Full sidebar, 64 px icon rail, or an overlay drawer behind a top bar. */
type Layout = 'desktop' | 'rail' | 'phone';

interface NavItem {
  path: string;
  icon: string;
  label: TranslationKey;
  exact: boolean;
}

/** The signed-in frame: sidebar navigation, the user menu and the page in the content area. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    UserMenu,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  protected readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly sidenav = viewChild.required(MatSidenav);
  private readonly container = viewChild.required(MatSidenavContainer);

  protected readonly layout = toSignal(
    inject(BreakpointObserver)
      .observe([DESKTOP, TABLET])
      .pipe(
        map(({ breakpoints }): Layout => (breakpoints[DESKTOP] ? 'desktop' : breakpoints[TABLET] ? 'rail' : 'phone')),
      ),
    { requireSync: true },
  );
  protected readonly rail = computed(() => this.layout() === 'rail');
  protected readonly phone = computed(() => this.layout() === 'phone');

  protected readonly items: NavItem[] = [
    { path: '/', icon: 'work', label: 'nav.jobs', exact: true },
    { path: '/profile', icon: 'person', label: 'nav.profile', exact: false },
  ];

  constructor() {
    const shortcuts = inject(Shortcuts);
    const destroyRef = inject(DestroyRef);
    shortcuts.register(
      { key: 'n', description: 'nav.newJob', handler: () => void this.router.navigateByUrl('/jobs/new') },
      destroyRef,
    );
    shortcuts.register({ key: '?', description: 'shortcuts.help', handler: () => this.openShortcuts() }, destroyRef);

    // The sidebar's width changes with the layout without a mode change, so re-measure it for the content margin.
    afterRenderEffect(() => {
      this.layout();
      this.container().updateContentMargins();
    });
  }

  /** On phones the drawer covers the page, so it gets out of the way once a destination is chosen. */
  protected chosen(): void {
    if (this.phone()) {
      void this.sidenav().close();
    }
  }

  private openShortcuts(): void {
    this.dialog.open(ShortcutsDialog);
  }
}
