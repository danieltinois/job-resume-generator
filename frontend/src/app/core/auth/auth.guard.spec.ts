import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiTestProviders } from '../../auth/testing';
import { SIGNING_OUT, guestGuard } from './auth.guard';
import { AuthStore } from './auth-store';

@Component({ template: 'page' })
class Page {}

describe('guestGuard', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        ...apiTestProviders,
        provideRouter([
          { path: 'login', canActivate: [guestGuard], component: Page },
          { path: 'profile', component: Page },
          { path: '', component: Page },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  it('shows the sign-in page to a signed-out visitor', async () => {
    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/login');
  });

  it('sends a signed-in user to the app instead', async () => {
    TestBed.inject(AuthStore).acceptToken('token');

    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/');
  });

  it('sends a signed-in user to the page they were heading for', async () => {
    TestBed.inject(AuthStore).acceptToken('token');

    await harness.navigateByUrl('/login?next=%2Fprofile');

    expect(router.url).toBe('/profile');
  });

  it('lets sign-out reach the sign-in page before the session ends', async () => {
    TestBed.inject(AuthStore).acceptToken('token');

    await router.navigateByUrl('/login', { state: { [SIGNING_OUT]: true } });

    expect(router.url).toBe('/login');
  });
});
