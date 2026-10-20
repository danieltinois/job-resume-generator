import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
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
});
