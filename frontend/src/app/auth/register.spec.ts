import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Register } from './register';
import { apiTestProviders, type } from './testing';

describe('Register', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('ui-lang');
    TestBed.configureTestingModule({ imports: [Register], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
  });

  async function fillAndSubmit(password: string) {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    type(element, 'input[name="name"]', 'Alex');
    type(element, 'input[name="email"]', 'alex@example.com');
    type(element, 'input[name="password"]', password);
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    return fixture;
  }

  it('maps server errors to their fields', async () => {
    const fixture = await fillAndSubmit('correct-horse');

    backend.expectOne('/api/auth/register').flush(
      { status: 422, errors: [{ path: 'password', message: 'too weak' }] },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.password.errors).toEqual({ server: 'too weak' });
    expect(fixture.nativeElement.textContent).toContain('too weak');
  });

  it('marks a taken email on 409', async () => {
    const fixture = await fillAndSubmit('correct-horse');

    backend.expectOne('/api/auth/register').flush({ status: 409 }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(fixture.componentInstance.form.controls.email.hasError('taken')).toBe(true);
  });

  it('rejects a password over 72 bytes before calling the server', async () => {
    const fixture = await fillAndSubmit('é'.repeat(40));

    backend.expectNone('/api/auth/register');
    expect(fixture.componentInstance.form.controls.password.hasError('maxBytes')).toBe(true);
  });

  it('tells the user to check their email after registering', async () => {
    const fixture = await fillAndSubmit('correct-horse');

    backend.expectOne('/api/auth/register').flush(null, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Check your email');
  });
});
