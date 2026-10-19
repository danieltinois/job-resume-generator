import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { Profile } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import { apiTestProviders } from '../auth/testing';
import example from '../../testing/profile-example.json';
import { Autosave, type ConflictChoice } from './autosave';
import { buildProfileForm, type ProfileForm } from './profile-form';

describe('Autosave', () => {
  let backend: HttpTestingController;
  let form: ProfileForm;
  let autosave: Autosave;
  const version = signal(3);
  let choice: ConflictChoice;
  let reloaded: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    form = buildProfileForm(example as Profile);
    version.set(3);
    choice = 'keep';
    reloaded = null;
    autosave = new Autosave(TestBed.inject(HttpClient), form, version, {
      resolveConflict: async () => choice,
      reload: (stored) => (reloaded = stored),
    });
    autosave.start();
  });

  afterEach(() => {
    autosave.stop();
    vi.useRealTimers();
  });

  const rename = (name: string) => form.controls.personal.controls.name.setValue(name);

  it('saves once, 1500 ms after the last change', async () => {
    rename('A');
    await vi.advanceTimersByTimeAsync(1000);
    rename('Ab');
    await vi.advanceTimersByTimeAsync(1499);
    backend.expectNone('/api/profile');

    await vi.advanceTimersByTimeAsync(1);

    const request = backend.expectOne('/api/profile');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.version).toBe(3);
    expect(request.request.body.data.personal.name).toBe('Ab');
    request.flush({ version: 4 });
    await vi.waitFor(() => expect(autosave.status()).toBe('saved'));
    expect(version()).toBe(4);
  });

  it('saves immediately on demand', async () => {
    rename('Now');

    void autosave.saveNow();

    expect(backend.expectOne('/api/profile').request.body.data.personal.name).toBe('Now');
  });

  it('never has two saves in flight and sends the latest data next', async () => {
    rename('First');
    void autosave.saveNow();
    const first = backend.expectOne('/api/profile');
    rename('Second');
    void autosave.saveNow();
    backend.expectNone('/api/profile');

    first.flush({ version: 4 });

    await vi.waitFor(() => {
      const second = backend.expectOne('/api/profile');
      expect(second.request.body.version).toBe(4);
      expect(second.request.body.data.personal.name).toBe('Second');
      second.flush({ version: 5 });
    });
  });

  it('does not send an invalid form', async () => {
    rename('');

    await autosave.saveNow();

    backend.expectNone('/api/profile');
    expect(autosave.status()).toBe('invalid');
  });

  it('keeps local edits on conflict until the user chooses', async () => {
    let decide!: (choice: ConflictChoice) => void;
    autosave = new Autosave(TestBed.inject(HttpClient), form, version, {
      resolveConflict: () => new Promise((resolve) => (decide = resolve)),
      reload: (stored) => (reloaded = stored),
    });
    rename('Mine');

    void autosave.saveNow();
    backend.expectOne('/api/profile').flush({ status: 409 }, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() => expect(autosave.status()).toBe('conflict'));

    expect(form.controls.personal.controls.name.value).toBe('Mine');
    expect(reloaded).toBeNull();
    decide('reload');
    await vi.waitFor(() =>
      backend.expectOne((r) => r.method === 'GET' && r.url === '/api/profile').flush({ version: 9, data: {} }),
    );
    await vi.waitFor(() => expect(reloaded).toEqual({ version: 9, data: {} }));
  });

  it('"keep mine" overwrites with the fresh version', async () => {
    rename('Mine');

    void autosave.saveNow();
    backend.expectOne('/api/profile').flush({ status: 409 }, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() =>
      backend.expectOne((r) => r.method === 'GET' && r.url === '/api/profile').flush({ version: 7, data: {} }),
    );

    await vi.waitFor(() => {
      const retry = backend.expectOne((r) => r.method === 'PUT');
      expect(retry.request.body.version).toBe(7);
      expect(retry.request.body.data.personal.name).toBe('Mine');
      retry.flush({ version: 8 });
    });
    await vi.waitFor(() => expect(version()).toBe(8));
  });

  it('puts server validation errors on the controls', async () => {
    void autosave.saveNow();
    backend.expectOne('/api/profile').flush(
      { status: 422, errors: [{ path: 'experiences[0].company', message: 'is required' }] },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await vi.waitFor(() => expect(autosave.status()).toBe('invalid'));
    expect(form.get('experiences.0.company')?.errors).toEqual({ server: 'is required' });
  });

  it('survives an access token expiring mid-save', async () => {
    rename('Later');
    void autosave.saveNow();

    backend.expectOne('/api/profile').flush(null, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => backend.expectOne('/api/auth/refresh').flush({ accessToken: 'fresh' }));
    await vi.waitFor(() => {
      const retry = backend.expectOne('/api/profile');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
      retry.flush({ version: 4 });
    });

    await vi.waitFor(() => expect(autosave.status()).toBe('saved'));
  });
  it('reports unsaved changes from the first keystroke until they are saved', async () => {
    expect(autosave.hasUnsavedChanges()).toBe(false);

    rename('Typed');

    expect(autosave.status()).toBe('unsaved');
    expect(autosave.hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    backend.expectOne('/api/profile').flush({ version: 4 });
    await vi.waitFor(() => expect(autosave.status()).toBe('saved'));
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });

  it('flush sends pending edits without waiting for the pause, and settles after the save', async () => {
    rename('Leaving');
    let settled = false;

    const flushed = autosave.flush().then(() => (settled = true));

    const request = backend.expectOne('/api/profile');
    expect(request.request.body.data.personal.name).toBe('Leaving');
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    request.flush({ version: 4 });
    await flushed;
    expect(autosave.hasUnsavedChanges()).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    backend.expectNone('/api/profile');
  });

  it('flush waits for the save in flight, then sends what changed during it', async () => {
    rename('First');
    void autosave.saveNow();
    const first = backend.expectOne('/api/profile');
    rename('Second');

    const flushed = autosave.flush();
    first.flush({ version: 4 });

    await vi.waitFor(() => {
      const second = backend.expectOne('/api/profile');
      expect(second.request.body.data.personal.name).toBe('Second');
      second.flush({ version: 5 });
    });
    await flushed;
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });

  it('keeps reporting edits that could not be saved', async () => {
    rename('');

    await autosave.flush();

    backend.expectNone('/api/profile');
    expect(autosave.hasUnsavedChanges()).toBe(true);
  });
});
