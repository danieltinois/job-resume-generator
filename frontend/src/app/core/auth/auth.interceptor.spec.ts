import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth-store';
import { LOCK_MANAGER } from './refresh-coordinator';

describe('authInterceptor', () => {
  let http: HttpClient;
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
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    store.acceptToken('old-token');
  });

  afterEach(() => backend.verify());

  it('adds the bearer token to API calls', () => {
    http.get('/api/profile').subscribe();

    expect(backend.expectOne('/api/profile').request.headers.get('Authorization')).toBe('Bearer old-token');
  });

  it('does not add the bearer token to auth calls, but sends cookies', () => {
    http.post('/api/auth/refresh', null).subscribe();

    const request = backend.expectOne('/api/auth/refresh').request;
    expect(request.headers.has('Authorization')).toBe(false);
    expect(request.withCredentials).toBe(true);
  });

  it('refreshes once and retries on 401', async () => {
    const result = firstValueFrom(http.get<{ ok: boolean }>('/api/profile'));
    backend.expectOne('/api/profile').flush(null, { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() => backend.expectOne('/api/auth/refresh').flush({ accessToken: 'new-token' }));
    await vi.waitFor(() => {
      const retry = backend.expectOne('/api/profile');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
      retry.flush({ ok: true });
    });

    expect(await result).toEqual({ ok: true });
    expect(store.accessToken()).toBe('new-token');
  });

  it('shares one refresh between concurrent 401s', async () => {
    const results = ['/api/a', '/api/b', '/api/c'].map((url) => firstValueFrom(http.get(url)));
    for (const url of ['/api/a', '/api/b', '/api/c']) {
      backend.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
    }

    await vi.waitFor(() => backend.expectOne('/api/auth/refresh').flush({ accessToken: 'new-token' }));
    await vi.waitFor(() => {
      for (const url of ['/api/a', '/api/b', '/api/c']) {
        backend.expectOne(url).flush({});
      }
    });

    await Promise.all(results);
  });

  it('signs out and goes to login when the refresh fails', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(http.get('/api/profile'));
    backend.expectOne('/api/profile').flush(null, { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() =>
      backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(result).rejects.toBeTruthy();
    expect(store.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: 1 } });
  });

  it('leaves non-API requests alone', () => {
    http.get('/assets/x.json').subscribe();

    expect(backend.expectOne('/assets/x.json').request.headers.has('Authorization')).toBe(false);
  });
});
