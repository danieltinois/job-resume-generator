import { OverlayContainer } from '@angular/cdk/overlay';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { apiTestProviders } from '../auth/testing';
import { SIGNING_OUT } from '../core/auth/auth.guard';
import { AuthStore } from '../core/auth/auth-store';
import { BROWSER_LANGUAGE, I18n } from '../core/i18n/i18n';
import { Theme } from '../core/theme/theme';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  const forgetChoices = () => {
    localStorage.removeItem('ui-lang');
    localStorage.removeItem('ui-theme');
  };
  beforeEach(forgetChoices);
  afterEach(() => {
    forgetChoices();
    TestBed.inject(OverlayContainer).ngOnDestroy();
    vi.restoreAllMocks();
  });

  async function openMenu(browserLanguage = 'en'): Promise<MatMenuHarness> {
    TestBed.configureTestingModule({
      providers: [...apiTestProviders, { provide: BROWSER_LANGUAGE, useValue: browserLanguage }],
    });
    TestBed.inject(AuthStore).user.set({ name: 'Ada Example', email: 'ada@example.com' });
    const fixture = TestBed.createComponent(UserMenu);
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    expect(await menu.getTriggerText()).toContain('Ada Example');
    await menu.open();
    return menu;
  }

  it('switches theme', async () => {
    const menu = await openMenu();
    const set = vi.spyOn(TestBed.inject(Theme), 'set');

    await menu.clickItem({ text: /Dark/ });

    expect(set).toHaveBeenCalledWith('dark');
  });

  it('switches language', async () => {
    const menu = await openMenu('pt');
    expect(TestBed.inject(I18n).lang()).toBe('pt');

    await menu.clickItem({ text: /English/ });

    expect(TestBed.inject(I18n).lang()).toBe('en');
  });

  it('signs out', async () => {
    const menu = await openMenu();
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    let leave!: (left: boolean) => void;
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockReturnValue(new Promise<boolean>((resolve) => (leave = resolve)));

    await menu.clickItem({ text: /Sign out/ });

    expect(navigate).toHaveBeenCalledWith('/login', { state: { [SIGNING_OUT]: true } });
    // The session must outlive the page, so the profile editor can still save on its way out.
    http.expectNone('/api/auth/logout');

    leave(true);
    await vi.waitFor(() => http.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush(null));
    await vi.waitFor(() => expect(TestBed.inject(AuthStore).isSignedIn()).toBe(false));
  });

  it('stays signed in when the page refuses to leave', async () => {
    const menu = await openMenu();
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(false);

    await menu.clickItem({ text: /Sign out/ });
    await Promise.resolve();

    http.expectNone('/api/auth/logout');
    expect(TestBed.inject(AuthStore).isSignedIn()).toBe(true);
  });
});
