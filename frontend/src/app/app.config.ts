import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthStore } from './core/auth/auth-store';
import { authInterceptor } from './core/auth/auth.interceptor';
import { Theme } from './core/theme/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
    // The saved colour scheme goes on the page first, so nothing flashes while the session is restored.
    provideAppInitializer(() => void inject(Theme)),
    // Restore the session from the refresh cookie before the first route is guarded.
    provideAppInitializer(() => inject(AuthStore).restore()),
  ],
};
