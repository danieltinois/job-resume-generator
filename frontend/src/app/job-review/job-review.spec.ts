import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Analysis, Profile } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { JobReview } from './job-review';

const ANALYSIS: Analysis = {
  language: 'EN',
  matchedSkills: ['Kafka', 'Python'],
  missingSkills: ['CI/CD'],
  scores: { ach_0000000a: 4 },
  suggestion: {
    experienceOrder: ['exp_0000000a'],
    achievements: { exp_0000000a: ['ach_0000000a'] },
    projects: ['prj_0000000a'],
    skillOrder: {},
  },
  warnings: [],
};

describe('JobReview', () => {
  let backend: HttpTestingController;

  async function render() {
    TestBed.configureTestingModule({ imports: [JobReview], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const fixture = TestBed.createComponent(JobReview);
    fixture.componentRef.setInput('id', 'j1');
    fixture.detectChanges();
    backend.expectOne('/api/jobs/j1').flush({ id: 'j1', title: 'Backend Engineer', language: 'EN' });
    backend.expectOne('/api/profile').flush({ version: 1, data: example as Profile });
    backend.expectOne('/api/jobs/j1/analysis').flush(ANALYSIS);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows matched and missing skills and the suggested bullets', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[data-test="matched"]')?.textContent).toContain('Kafka');
    expect(element.querySelector('[data-test="missing"]')?.textContent).toContain('CI/CD');
    expect(element.querySelector<HTMLInputElement>('input[data-achievement="ach_0000000a"]')?.checked).toBe(true);
    expect(element.querySelector<HTMLInputElement>('input[data-achievement="ach_0000000b"]')?.checked).toBe(false);
  });

  it('switching language refetches warnings but keeps the selection', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.state.toggleAchievement('exp_0000000a', 'ach_0000000b');

    component.setLanguage('PT');
    backend.expectOne('/api/jobs/j1/analysis?lang=PT').flush({ ...ANALYSIS, language: 'PT', warnings: ['summary: x'] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.state.selection().achievements['exp_0000000a']).toContain('ach_0000000b');
    expect(fixture.nativeElement.textContent).toContain('summary: x');
  });

  it('saves and offers the download', async () => {
    const fixture = await render();

    fixture.nativeElement.querySelector('button[data-test="save"]').click();
    const save = backend.expectOne((request) => request.method === 'POST' && request.url === '/api/resumes');
    expect(save.request.body.jobId).toBe('j1');
    expect(save.request.body.language).toBe('EN');
    save.flush({ id: 'r1', warnings: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[data-test="download"]').click();
    backend.expectOne('/api/resumes/r1/pdf').flush(new Blob(['%PDF']));
    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });
});
