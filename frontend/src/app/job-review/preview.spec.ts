import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { ResumeRequest } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import { apiTestProviders } from '../auth/testing';
import { Preview } from './preview';

describe('Preview', () => {
  let backend: HttpTestingController;
  let requests: Subject<ResumeRequest>;
  let preview: Preview;
  let urls: number;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    urls = 0;
    URL.createObjectURL = vi.fn(() => `blob:${++urls}`);
    URL.revokeObjectURL = vi.fn();
    requests = new Subject();
    preview = new Preview(TestBed.inject(HttpClient), requests);
  });

  afterEach(() => {
    preview.stop();
    vi.useRealTimers();
  });

  const request = (language: 'PT' | 'EN'): ResumeRequest => ({ jobId: 'j1', language, selection: {} });

  it('waits 500 ms after the last change', async () => {
    requests.next(request('PT'));
    await vi.advanceTimersByTimeAsync(300);
    requests.next(request('EN'));
    await vi.advanceTimersByTimeAsync(499);
    backend.expectNone('/api/resumes/preview');

    await vi.advanceTimersByTimeAsync(1);

    expect(backend.expectOne('/api/resumes/preview').request.body.language).toBe('EN');
  });

  it('shows only the latest selection, cancelling the older render', async () => {
    requests.next(request('PT'));
    await vi.advanceTimersByTimeAsync(500);
    const first = backend.expectOne('/api/resumes/preview');

    requests.next(request('EN'));
    await vi.advanceTimersByTimeAsync(500);
    const second = backend.expectOne('/api/resumes/preview');

    expect(first.cancelled).toBe(true);
    second.flush(new Blob(['%PDF']));
    expect(preview.url()).toBe('blob:1');
    expect(preview.loading()).toBe(false);
  });

  it('revokes the previous object URL', async () => {
    requests.next(request('PT'));
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/resumes/preview').flush(new Blob(['%PDF']));
    requests.next(request('EN'));
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/resumes/preview').flush(new Blob(['%PDF']));

    expect(preview.url()).toBe('blob:2');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });

  it('reports a failed render and recovers on the next change', async () => {
    requests.next(request('PT'));
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/resumes/preview').flush(null, { status: 422, statusText: 'Unprocessable Content' });
    expect(preview.failed()).toBe(true);

    requests.next(request('EN'));
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/resumes/preview').flush(new Blob(['%PDF']));

    expect(preview.failed()).toBe(false);
  });
});
