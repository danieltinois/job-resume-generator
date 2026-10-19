import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';

/** Pages behind sign-in; the session was restored at startup, so this is a plain check. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthStore).isSignedIn() || inject(Router).createUrlTree(['/login'], { queryParams: { next: state.url } });

/** Navigation state set by sign-out, which reaches the sign-in page while still signed in. */
export const SIGNING_OUT = 'signingOut';

/**
 * Sign-in and registration pages: a signed-in user goes on to the app, or to
 * the page the sign-in was for, except while signing out.
 */
export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  if (!inject(AuthStore).isSignedIn() || router.currentNavigation()?.extras.state?.[SIGNING_OUT]) {
    return true;
  }
  return router.parseUrl(route.queryParamMap.get('next') || '/');
};
