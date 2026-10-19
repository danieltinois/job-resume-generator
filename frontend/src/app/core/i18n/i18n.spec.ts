import { TestBed } from '@angular/core/testing';
import { BROWSER_LANGUAGE, I18n } from './i18n';

describe('I18n', () => {
  // Spec files share one localStorage (no isolation), so the remembered
  // choice must not outlive these tests.
  const forgetChoice = () => {
    try {
      localStorage.removeItem('ui-lang');
    } catch {
      // storage unavailable: fine
    }
  };
  beforeEach(forgetChoice);
  afterEach(forgetChoice);

  it('follows a Portuguese browser', () => {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'pt-BR' }] });

    expect(TestBed.inject(I18n).lang()).toBe('pt');
  });

  it('uses English for other browsers', () => {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'de-DE' }] });

    expect(TestBed.inject(I18n).lang()).toBe('en');
  });

  it('switches at runtime and interpolates', () => {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'pt-BR' }] });
    const i18n = TestBed.inject(I18n);
    expect(i18n.t('app.title')).toBe('Resume Tailor');

    i18n.setLang('en');

    expect(i18n.t('auth.welcome', { name: 'Alex' })).toBe('Welcome, Alex');
    i18n.setLang('pt');
    expect(i18n.t('auth.welcome', { name: 'Alex' })).toBe('Olá, Alex');
  });
  it('keeps the document language in step, for screen readers and hyphenation', () => {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'pt-BR' }] });
    const i18n = TestBed.inject(I18n);
    TestBed.tick();
    expect(document.documentElement.lang).toBe('pt-BR');

    i18n.setLang('en');
    TestBed.tick();

    expect(document.documentElement.lang).toBe('en');
  });
});
