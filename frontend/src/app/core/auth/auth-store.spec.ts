import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth-store';
import { LOCK_MANAGER } from './refresh-coordinator';

describe('AuthStore', () => {
  let backend: HttpTestingController;
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCK_MANAGER, useValue: undefined },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => backend.verify());

  it('restores the session from the refresh cookie', async () => {
    const restored = store.restore();

    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'token' });
    await vi.waitFor(() =>
      backend.expectOne('/api/me').flush({ id: 'u1', email: 'alex@example.com', name: 'Alex' }),
    );
    await restored;

    expect(store.isSignedIn()).toBe(true);
    expect(store.user()?.name).toBe('Alex');
  });

  it('stays signed out without a refresh cookie', async () => {
    const restored = store.restore();

    backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await restored;

    expect(store.isSignedIn()).toBe(false);
    expect(store.user()).toBeNull();
  });

  it('logs in and loads the user', async () => {
    const login = store.login('alex@example.com', 'correct-horse');

    const request = backend.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'alex@example.com', password: 'correct-horse' });
    request.flush({ accessToken: 'token' });
    await vi.waitFor(() => backend.expectOne('/api/me').flush({ id: 'u1', name: 'Alex' }));
    await login;

    expect(store.accessToken()).toBe('token');
  });

  it('forgets the token on logout even if the call fails', async () => {
    store.acceptToken('token');
    const logout = store.logout();

    backend.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Error' });
    await logout;

    expect(store.isSignedIn()).toBe(false);
  });
  it('keeps the session when the refresh cannot reach the server', async () => {
    store.acceptToken('token');

    const refreshed = store.refresh();
    backend.expectOne('/api/auth/refresh').error(new ProgressEvent('error'));

    await expect(refreshed).rejects.toBeTruthy();
    expect(store.isSignedIn()).toBe(true);
  });

  it('starts signed out, without failing, when the server cannot be reached', async () => {
    const restored = store.restore();

    backend.expectOne('/api/auth/refresh').error(new ProgressEvent('error'));

    await expect(restored).resolves.toBeUndefined();
    expect(store.isSignedIn()).toBe(false);
  });
});
