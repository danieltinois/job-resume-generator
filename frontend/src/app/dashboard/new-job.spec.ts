import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { apiTestProviders, type } from '../auth/testing';
import { NewJob } from './new-job';

describe('NewJob', () => {
  it('creates the job and opens its review', async () => {
    TestBed.configureTestingModule({ imports: [NewJob], providers: apiTestProviders });
    const backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(NewJob);
    fixture.detectChanges();

    type(fixture.nativeElement, 'textarea[name="description"]', '# Backend Engineer\nJava and Kafka');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    const request = backend.expectOne('/api/jobs');
    expect(request.request.body).toEqual({ description: '# Backend Engineer\nJava and Kafka' });
    request.flush({ id: 'j9' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/jobs', 'j9', 'review']);
  });

  it('does not send an empty description', () => {
    TestBed.configureTestingModule({ imports: [NewJob], providers: apiTestProviders });
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(NewJob);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    backend.expectNone('/api/jobs');
  });
  it('analyzes on Ctrl+Enter', () => {
    TestBed.configureTestingModule({ imports: [NewJob], providers: apiTestProviders });
    const backend = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(NewJob);
    fixture.detectChanges();

    type(fixture.nativeElement, 'textarea[name="description"]', '# Backend Engineer\nJava and Kafka');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));

    const request = backend.expectOne('/api/jobs');
    expect(request.request.body).toEqual({ description: '# Backend Engineer\nJava and Kafka' });
  });

  it('does not send the job twice while the first request is in flight', () => {
    TestBed.configureTestingModule({ imports: [NewJob], providers: apiTestProviders });
    const backend = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(NewJob);
    fixture.detectChanges();

    type(fixture.nativeElement, 'textarea[name="description"]', '# Backend Engineer');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const press = () =>
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    press();
    press();

    backend.expectOne('/api/jobs');
  });
});
