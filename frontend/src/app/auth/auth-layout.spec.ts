import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BROWSER_LANGUAGE, I18n } from '../core/i18n/i18n';
import { Theme } from '../core/theme/theme';
import { AuthLayout } from './auth-layout';

@Component({ template: '<form data-test="form">sign-in form</form>' })
class Form {}

describe('AuthLayout', () => {
  const forgetChoices = () => {
    localStorage.removeItem('ui-lang');
    localStorage.removeItem('ui-theme');
  };
  beforeEach(forgetChoices);
  afterEach(forgetChoices);

  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AuthLayout, children: [{ path: 'login', component: Form }] }]),
        { provide: BROWSER_LANGUAGE, useValue: 'en' },
      ],
    });
    const harness = await RouterTestingHarness.create('/login');
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('shows the brand panel and the form outlet', async () => {
    const element = await render();

    const panel = element.querySelector('[data-test=brand-panel]');
    expect(panel?.textContent).toContain('Resume Tailor');
    expect(panel?.querySelectorAll('li')).toHaveLength(3);
    expect(element.querySelector('main [data-test=form]')?.textContent).toContain('sign-in form');
  });

  it('switches language and theme from the corner', async () => {
    const element = await render();

    element.querySelector<HTMLButtonElement>('[data-test=lang-pt] button')!.click();
    element.querySelector<HTMLButtonElement>('[data-test=theme-dark] button')!.click();

    expect(TestBed.inject(I18n).lang()).toBe('pt');
    expect(TestBed.inject(Theme).mode()).toBe('dark');
  });
});
