import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Login } from './login';
import { apiTestProviders, type } from './testing';

describe('Login', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('ui-lang');
    TestBed.configureTestingModule({ imports: [Login], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
  });

  async function render(google: boolean) {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    backend.expectOne('/api/auth/providers').flush({ google });
    await fixture.whenStable();
    return fixture;
  }

  it('shows Google only when enabled', async () => {
    const withGoogle = await render(true);
    expect(withGoogle.nativeElement.querySelector('a[href="/oauth2/authorization/google"]')).not.toBeNull();

    const withoutGoogle = await render(false);
    expect(withoutGoogle.nativeElement.querySelector('a[href="/oauth2/authorization/google"]')).toBeNull();
  });

  it('offers to resend the verification email for an unverified account', async () => {
    const fixture = await render(false);
    const element: HTMLElement = fixture.nativeElement;
    type(element, 'input[name="email"]', 'alex@example.com');
    type(element, 'input[name="password"]', 'correct-horse');

    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    backend.expectOne('/api/auth/login').flush({ status: 403, detail: 'Email not verified' },
      { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    const resend = element.querySelector<HTMLButtonElement>('button[data-test="resend"]');
    expect(resend).not.toBeNull();
    resend!.click();
    expect(backend.expectOne('/api/auth/resend-verification').request.body).toEqual({ email: 'alex@example.com' });
  });

  it('links to registration and password reset', async () => {
    const fixture = await render(true);
    const element: HTMLElement = fixture.nativeElement;
    const column = element.querySelector('.auth-form');
    expect(column).not.toBeNull();
    for (const href of ['/register', '/forgot-password']) {
      const link = element.querySelector(`a[href="${href}"]`);
      expect(link, href).not.toBeNull();
      expect(column!.contains(link), href).toBe(true);
    }
    expect(element.querySelectorAll('h1').length).toBe(1);
    expect(element.querySelector('mat-card')).toBeNull();
  });

  it('explains invalid credentials', async () => {
    const fixture = await render(false);
    const element: HTMLElement = fixture.nativeElement;
    type(element, 'input[name="email"]', 'alex@example.com');
    type(element, 'input[name="password"]', 'wrong-password');

    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    backend.expectOne('/api/auth/login').flush({ status: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Invalid email or password');
  });
});
