import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthStore } from '../core/auth/auth-store';
import { LOCK_MANAGER } from '../core/auth/refresh-coordinator';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { AppShell } from './app-shell';

@Component({ template: '<p>page</p>' })
class Page {}

/** A BreakpointObserver that answers every `(min-width: Npx)` query as a screen `width` px wide. */
function screenWidth(width: number) {
  const state = (queries: string | string[]): BreakpointState => {
    const breakpoints = Object.fromEntries(
      [queries].flat().map((query) => [query, width >= Number(/min-width:\s*(\d+)px/.exec(query)?.[1])]),
    );
    return { matches: Object.values(breakpoints).some(Boolean), breakpoints };
  };
  return {
    provide: BreakpointObserver,
    useValue: { observe: (queries: string | string[]) => of(state(queries)), isMatched: () => false },
  };
}

describe('AppShell', () => {
  async function render(width: number, url: string): Promise<RouterTestingHarness> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [
              { path: '', pathMatch: 'full', component: Page },
              { path: 'jobs/new', component: Page },
              { path: 'profile', component: Page },
            ],
          },
        ]),
        { provide: BROWSER_LANGUAGE, useValue: 'en' },
        { provide: LOCK_MANAGER, useValue: undefined },
        screenWidth(width),
      ],
    });
    TestBed.inject(AuthStore).user.set({ name: 'Ada Example', email: 'ada@example.com' });
    return RouterTestingHarness.create(url);
  }

  const navLink = (harness: RouterTestingHarness, href: string) =>
    harness.fixture.nativeElement.querySelector(`nav a[href="${href}"]`) as HTMLAnchorElement;

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('marks the current page', async () => {
    const harness = await render(1280, '/profile');

    expect(navLink(harness, '/profile').getAttribute('aria-current')).toBe('page');
    expect(navLink(harness, '/').hasAttribute('aria-current')).toBe(false);
  });

  it('collapses to a rail on tablets', async () => {
    const harness = await render(900, '/');
    const element = harness.fixture.nativeElement as HTMLElement;

    const links = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['Jobs', 'Profile']);
    for (const link of links) {
      expect(link.querySelector('.label')?.classList).toContain('visually-hidden');
    }
    expect(element.querySelector('[data-test=open-nav]')).toBeNull();
  });

  it('shows the labels on desktops', async () => {
    const harness = await render(1280, '/');

    const link = navLink(harness, '/profile');
    expect(link.hasAttribute('aria-label')).toBe(false);
    expect(link.querySelector('.label')?.classList).not.toContain('visually-hidden');
  });

  it('opens and closes the navigation on phones', async () => {
    const harness = await render(390, '/');
    const element = harness.fixture.nativeElement as HTMLElement;
    const sidenav = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(MatSidenavHarness);
    expect(await sidenav.getMode()).toBe('over');
    expect(await sidenav.isOpen()).toBe(false);

    element.querySelector<HTMLButtonElement>('[data-test=open-nav]')!.click();
    expect(await sidenav.isOpen()).toBe(true);

    const escape = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
    element.querySelector('mat-sidenav')!.dispatchEvent(escape);
    expect(await sidenav.isOpen()).toBe(false);

    element.querySelector<HTMLButtonElement>('[data-test=open-nav]')!.click();
    expect(await sidenav.isOpen()).toBe(true);
    navLink(harness, '/profile').click();
    expect(await sidenav.isOpen()).toBe(false);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/profile'));
  });

  it('N opens a new job', async () => {
    await render(1280, '/');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/jobs/new'));
  });
});
