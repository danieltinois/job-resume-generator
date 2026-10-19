import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { ForgotPassword } from './forgot-password';
import { GoogleCallback } from './google-callback';
import { ResetPassword } from './reset-password';
import { apiTestProviders, type } from './testing';
import { VerifyEmail } from './verify-email';

describe('email link screens', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('ui-lang');
    TestBed.configureTestingModule({ providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
  });

  it('VerifyEmail confirms the token from the URL', async () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.componentRef.setInput('token', 'abc');
    fixture.detectChanges();

    backend.expectOne('/api/auth/verify-email').flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email confirmed');
  });

  it('VerifyEmail explains an expired link', async () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.componentRef.setInput('token', 'old');
    fixture.detectChanges();

    backend.expectOne('/api/auth/verify-email').flush({ status: 400 }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('invalid or has expired');
  });

  it('ResetPassword submits the token and the new password', async () => {
    const fixture = TestBed.createComponent(ResetPassword);
    fixture.componentRef.setInput('token', 'abc');
    fixture.detectChanges();
    type(fixture.nativeElement, 'input[name="password"]', 'new-password');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(backend.expectOne('/api/auth/reset-password').request.body).toEqual({
      token: 'abc',
      password: 'new-password',
    });
  });

  it('ForgotPassword always confirms without revealing accounts', async () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    type(fixture.nativeElement, 'input[name="email"]', 'someone@example.com');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    backend.expectOne('/api/auth/forgot-password').flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('If an account exists');
  });

  it('GoogleCallback restores the session and goes home', async () => {
    const store = TestBed.inject(AuthStore);
    vi.spyOn(store, 'restore').mockImplementation(async () => store.acceptToken('token'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(GoogleCallback);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/');
  });
});
