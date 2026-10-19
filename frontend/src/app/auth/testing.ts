import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../core/auth/auth.interceptor';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { LOCK_MANAGER } from '../core/auth/refresh-coordinator';

/** Providers for component tests that talk to the API: fake backend, English UI, no Web Locks. */
export const apiTestProviders = [
  provideHttpClient(withInterceptors([authInterceptor])),
  provideHttpClientTesting(),
  provideRouter([]),
  { provide: BROWSER_LANGUAGE, useValue: 'en' },
  { provide: LOCK_MANAGER, useValue: undefined },
];

/** Sets an input's value the way a user types it, so reactive forms see the change. */
export function type(element: HTMLElement, selector: string, value: string): void {
  const input = element.querySelector<HTMLInputElement>(selector);
  if (!input) {
    throw new Error(`no element ${selector}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
