import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../core/auth/auth-store';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { Dashboard } from './dashboard';

const JOBS = [
  { id: 'j1', title: 'Backend Engineer', company: 'Example', language: 'EN', createdAt: '2026-10-19T10:00:00Z' },
  { id: 'j2', title: 'Dev Java', company: null, language: 'PT', createdAt: '2026-10-18T10:00:00Z' },
];
const RESUMES = [{ id: 'r1', jobId: 'j1', language: 'EN', createdAt: '2026-10-19T11:00:00Z' }];

describe('Dashboard', () => {
  let backend: HttpTestingController;

  async function render(profile: unknown = example) {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    backend.expectOne('/api/jobs').flush(JOBS);
    backend.expectOne('/api/resumes').flush(RESUMES);
    backend.expectOne('/api/profile').flush({ version: 1, data: profile });
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('lists jobs with their resumes', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    const jobs = element.querySelectorAll('[data-test="job"]');
    expect(jobs.length).toBe(2);
    expect(jobs[0].textContent).toContain('Backend Engineer');
    expect(jobs[0].querySelectorAll('[data-test="resume"]').length).toBe(1);
    expect(jobs[1].querySelectorAll('[data-test="resume"]').length).toBe(0);
    expect(jobs[0].querySelector('a[href="/jobs/j1/review"]')).not.toBeNull();
  });

  it('points to the profile editor while the profile is empty', async () => {
    const fixture = await render({ personal: { name: 'Alex' }, experiences: [] });

    expect(fixture.nativeElement.querySelector('a[href="/profile"][data-test="fill-profile"]')).not.toBeNull();
  });

  it('asks before deleting a job', async () => {
    const fixture = await render();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const remove = () => fixture.nativeElement.querySelector('[data-test="job"] button[data-test="delete-job"]').click();

    remove();
    backend.expectNone((request) => request.method === 'DELETE');

    remove();
    backend.expectOne((request) => request.method === 'DELETE' && request.url === '/api/jobs/j1')
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelectorAll('[data-test="job"]').length).toBe(1);
  });
});
