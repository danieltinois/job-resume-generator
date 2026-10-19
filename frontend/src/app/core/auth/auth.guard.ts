import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';

/** Pages behind sign-in; the session was restored at startup, so this is a plain check. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthStore).isSignedIn() || inject(Router).createUrlTree(['/login'], { queryParams: { next: state.url } });
