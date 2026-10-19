import { TestBed } from '@angular/core/testing';
import { apiTestProviders } from './auth/testing';
import { App } from './app';
import { AuthStore } from './core/auth/auth-store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: apiTestProviders }).compileComponents();
  });

  it('renders the toolbar title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar');

    expect(toolbar?.textContent).toContain('Resume Tailor');
  });

  it('shows navigation and sign out only when signed in', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Sign out');

    TestBed.inject(AuthStore).acceptToken('token');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sign out');
    expect(fixture.nativeElement.querySelector('a[href="/profile"]')).not.toBeNull();
  });
});
