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

  it('keeps the analysis of the latest language when switching fast', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component.setLanguage('PT');
    component.setLanguage('EN');
    const pt = backend.expectOne('/api/jobs/j1/analysis?lang=PT');
    backend.expectOne('/api/jobs/j1/analysis?lang=EN').flush({ ...ANALYSIS, warnings: ['in English'] });
    if (!pt.cancelled) {
      pt.flush({ ...ANALYSIS, language: 'PT', warnings: ['in Portuguese'] });
    }
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pt.cancelled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('in English');
    expect(fixture.nativeElement.textContent).not.toContain('in Portuguese');
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
  it('says when the job cannot be loaded instead of loading forever', async () => {
    TestBed.configureTestingModule({ imports: [JobReview], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(JobReview);
    fixture.componentRef.setInput('id', 'gone');
    fixture.detectChanges();

    backend.expectOne('/api/jobs/gone').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
    expect(fixture.nativeElement.textContent).not.toContain('Loading');
  });

  it('explains why a resume could not be saved', async () => {
    const fixture = await render();

    fixture.nativeElement.querySelector('button[data-test="save"]').click();
    backend
      .expectOne((request) => request.method === 'POST' && request.url === '/api/resumes')
      .flush(
        { status: 422, detail: 'The selection refers to an achievement that is no longer in the profile' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.save [role="alert"]')?.textContent).toContain('no longer in the profile');
    expect(fixture.nativeElement.querySelector('button[data-test="save"]').disabled).toBe(false);
  });
  it('names its controls for assistive technology', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    const group = element.querySelector('mat-button-toggle-group')!;
    expect(document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent).toContain('Resume language');
    expect(element.querySelector('.score')?.textContent).toContain('Relevance score');
    const skill = element.querySelector('.skill')!;
    const names = [...skill.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([expect.stringMatching(/^Move up: /), expect.stringMatching(/^Move down: /)]);
  });

  it('marks matched skills with a check, not only colour', async () => {
    const fixture = await render();
    const chips = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-test="matched"] mat-chip')];

    expect(chips.length).toBe(2);
    for (const chip of chips) {
      expect(chip.querySelector('mat-icon')?.textContent?.trim()).toBe('check');
    }
  });

  it('shows the relevance as a bar with the number for screen readers', async () => {
    const fixture = await render();
    const score = (fixture.nativeElement as HTMLElement).querySelector('.score')!;

    expect(score.querySelector('.visually-hidden')?.textContent).toContain('Relevance score');
    expect(score.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(score.textContent).toContain('4');
    expect(score.querySelector<HTMLElement>('.fill')?.style.width).toBe('80%');
  });

  it('shows a skeleton until the preview renders', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.preview app-skeleton')).not.toBeNull();
    expect(element.querySelector('.preview iframe')).toBeNull();
  });

  it('keeps move buttons reachable by keyboard', async () => {
    const fixture = await render();
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.achievement .move button')];

    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(getComputedStyle(button).display).not.toBe('none');
      expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    }
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
  });
});
