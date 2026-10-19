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
});
