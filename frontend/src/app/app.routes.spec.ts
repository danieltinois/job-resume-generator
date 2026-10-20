import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from './app.routes';
import { AuthStore } from './core/auth/auth-store';
import { authInterceptor } from './core/auth/auth.interceptor';
import { LOCK_MANAGER } from './core/auth/refresh-coordinator';
import { BROWSER_LANGUAGE } from './core/i18n/i18n';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: BROWSER_LANGUAGE, useValue: 'en' },
        { provide: LOCK_MANAGER, useValue: undefined },
      ],
    });
  });
  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  async function open(url: string): Promise<HTMLElement> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('shows the dashboard in the shell when signed in', async () => {
    TestBed.inject(AuthStore).acceptToken('token');

    const element = await open('/');

    expect(element.querySelector('app-shell')).not.toBeNull();
    expect(element.querySelector('app-auth-layout')).toBeNull();
  });

  it('sends a signed-out visitor from a shell page to sign in', async () => {
    const element = await open('/profile');

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/login?next=%2Fprofile'));
    expect(element.querySelector('app-auth-layout')).not.toBeNull();
    expect(element.querySelector('app-shell')).toBeNull();
  });

  it('guards moves between shell pages', async () => {
    TestBed.inject(AuthStore).acceptToken('token');
    await open('/');

    TestBed.inject(AuthStore).clear();
    await TestBed.inject(Router).navigateByUrl('/jobs/new');

    expect(TestBed.inject(Router).url).toBe('/login?next=%2Fjobs%2Fnew');
  });
});
