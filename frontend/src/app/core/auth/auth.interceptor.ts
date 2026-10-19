import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from './auth-store';

/**
 * Adds the access token to API calls. On a 401 it refreshes once (shared
 * with any other request failing at the same time) and retries; if the
 * session cannot be refreshed, it signs out and sends the user to login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }
  if (request.url.startsWith('/api/auth/')) {
    // The refresh cookie is scoped to /api/auth and must travel with these calls.
    return next(request.clone({ withCredentials: true }));
  }

  const store = inject(AuthStore);
  const router = inject(Router);
  const withToken = (token: string | null): HttpRequest<unknown> =>
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  const signOut = () => {
    store.clear();
    void router.navigate(['/login'], { queryParams: { expired: 1 } });
  };

  return next(withToken(store.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(store.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            signOut();
            return throwError(() => error);
          }
          return next(withToken(token)).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                signOut();
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
