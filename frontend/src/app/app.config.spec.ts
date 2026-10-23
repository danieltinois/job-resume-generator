import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LOCK_MANAGER } from './core/auth/refresh-coordinator';
import { appConfig } from './app.config';

describe('appConfig', () => {
  const formFieldDefaults = (): MatFormFieldDefaultOptions => {
    const provider = appConfig.providers.find(
      (candidate) =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'provide' in candidate &&
        candidate.provide === MAT_FORM_FIELD_DEFAULT_OPTIONS,
    );
    return (provider as { useValue: MatFormFieldDefaultOptions }).useValue;
  };

  it('uses outlined form fields', () => {
    expect(formFieldDefaults().appearance).toBe('outline');
  });

  it('sizes the form field subscript dynamically', () => {
    expect(formFieldDefaults().subscriptSizing).toBe('dynamic');
  });

  describe('at boot', () => {
    afterEach(() => {
      localStorage.removeItem('ui-theme');
      document.documentElement.style.colorScheme = '';
    });

    it('applies the saved theme before the session is restored', () => {
      localStorage.setItem('ui-theme', 'dark');
      TestBed.configureTestingModule({
        providers: [...appConfig.providers, provideHttpClientTesting(), { provide: LOCK_MANAGER, useValue: undefined }],
      });

      // Creating the injector runs the initializers; the refresh request they send is still unanswered.
      TestBed.inject(HttpTestingController).expectOne('/api/auth/refresh');

      expect(document.documentElement.style.colorScheme).toBe('dark');
    });
  });
});
