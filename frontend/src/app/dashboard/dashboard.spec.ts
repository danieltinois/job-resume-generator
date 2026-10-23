import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { AuthStore } from '../core/auth/auth-store';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { confirmDialogButton, dialogClosed, dialogOverlay } from '../ui/testing';
import { Dashboard } from './dashboard';

const JOBS = [
  { id: 'j1', title: 'Backend Engineer', company: 'Example', language: 'EN', createdAt: '2026-10-19T10:00:00Z' },
  { id: 'j2', title: 'Dev Java', company: null, language: 'PT', createdAt: '2026-10-18T10:00:00Z' },
];
const RESUMES = [{ id: 'r1', jobId: 'j1', language: 'EN', createdAt: '2026-10-19T11:00:00Z' }];

describe('Dashboard', () => {
  let backend: HttpTestingController;

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

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
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    const remove = async () => {
      await menu.open();
      dialogOverlay().querySelector<HTMLButtonElement>('button[data-test="delete-job"]')!.click();
    };

    await remove();
    const cancel = await confirmDialogButton('cancel');
    expect(dialogOverlay().textContent).toContain('Delete this job?');
    expect(dialogOverlay().textContent).toContain('Backend Engineer');
    cancel.click();
    await dialogClosed();
    backend.expectNone((request) => request.method === 'DELETE');

    await remove();
    (await confirmDialogButton('confirm')).click();
    await dialogClosed();
    backend.expectOne((request) => request.method === 'DELETE' && request.url === '/api/jobs/j1')
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-test="job"]').length).toBe(1);
  });

  function type(fixture: { nativeElement: HTMLElement; detectChanges(): void }, value: string): HTMLInputElement {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  }

  it('filters as you type', async () => {
    const fixture = await render();

    type(fixture, 'java');

    expect(fixture.nativeElement.querySelectorAll('[data-test="job"]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-test="job"]').textContent).toContain('Dev Java');
  });

  it('says when nothing matches', async () => {
    const fixture = await render();

    type(fixture, 'zzz');

    expect(fixture.nativeElement.textContent).toContain('No jobs match');
    expect(fixture.nativeElement.querySelectorAll('[data-test="job"]').length).toBe(0);
  });

  it('slash focuses the search', async () => {
    const fixture = await render();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input[type="search"]'));
  });

  it('shows skeletons while loading', () => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-test="job"]')).toBeNull();
    backend.match(() => true);
  });

  it('shows the empty state when there are no jobs', async () => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    backend.expectOne('/api/jobs').flush([]);
    backend.expectOne('/api/resumes').flush([]);
    backend.expectOne('/api/profile').flush({ version: 1, data: example });
    await fixture.whenStable();
    fixture.detectChanges();

    const empty: HTMLElement = fixture.nativeElement.querySelector('app-empty-state');
    expect(empty).not.toBeNull();
    expect(empty.querySelector('svg')).not.toBeNull();
    expect(fixture.debugElement.query((node) => node.name === 'app-empty-state').componentInstance.kind()).toBe('jobs');
  });

  it('keeps a long title on one line with the full text in title', async () => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const long = 'A'.repeat(200);
    backend.expectOne('/api/jobs').flush([{ ...JOBS[0], title: long }]);
    backend.expectOne('/api/resumes').flush([]);
    backend.expectOne('/api/profile').flush({ version: 1, data: example });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-test="job"] [title]').getAttribute('title')).toBe(long);
  });

  it('says when the page cannot load and tries again on request', async () => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    backend.expectOne('/api/jobs').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
    element.querySelector<HTMLButtonElement>('[data-test="retry"]')!.click();

    // The first attempt's other requests were cancelled when it failed.
    const live = (url: string) => backend.match(url).filter((request) => !request.cancelled);
    live('/api/jobs')[0].flush(JOBS);
    live('/api/resumes')[0].flush(RESUMES);
    live('/api/profile')[0].flush({ version: 1, data: example });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelectorAll('[data-test="job"]').length).toBe(2);
  });
});
