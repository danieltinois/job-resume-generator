import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import type { JobSummary, ResumeSummary, StoredProfile } from '../core/api/types';
import { downloadBlob } from '../core/download';
import { I18n } from '../core/i18n/i18n';
import { ConfirmDialog } from '../ui/confirm-dialog';

/** Home: every pasted job with the resumes generated for it. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatButtonModule, MatCardModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <h1>{{ i18n.t('dashboard.title') }}</h1>
        <a mat-flat-button routerLink="/jobs/new">+ {{ i18n.t('dashboard.newJob') }}</a>
      </header>

      @if (loaded()) {
        @if (profileEmpty()) {
          <mat-card class="call-to-action">
            <p>{{ i18n.t('dashboard.emptyProfile') }}</p>
            <a mat-stroked-button routerLink="/profile" data-test="fill-profile">{{ i18n.t('dashboard.fillProfile') }}</a>
          </mat-card>
        }
        @for (job of jobs(); track job.id) {
          <mat-card class="job" data-test="job">
            <div class="job-header">
              <div>
                <h2>{{ job.title || i18n.t('profile.untitled') }}</h2>
                <p class="meta">
                  @if (job.company) { {{ job.company }} · }
                  {{ job.createdAt | date: 'mediumDate' }}
                  <span class="language">{{ job.language }}</span>
                </p>
              </div>
              <div class="actions">
                <a mat-flat-button [routerLink]="['/jobs', job.id, 'review']">{{ i18n.t('dashboard.review') }}</a>
                <button mat-button type="button" data-test="delete-job" (click)="deleteJob(job)">
                  {{ i18n.t('common.remove') }}
                </button>
              </div>
            </div>
            @for (resume of resumesOf(job.id); track resume.id) {
              <div class="resume" data-test="resume">
                <span>{{ i18n.t('dashboard.resume') }} {{ resume.language }} · {{ resume.createdAt | date: 'short' }}</span>
                <button mat-button type="button" (click)="download(resume)">{{ i18n.t('dashboard.download') }}</button>
                <button mat-button type="button" (click)="deleteResume(resume)">{{ i18n.t('common.remove') }}</button>
              </div>
            }
          </mat-card>
        } @empty {
          <p class="empty">{{ i18n.t('dashboard.noJobs') }}</p>
        }
      } @else if (loadFailed()) {
        <p class="notice error" role="alert">{{ i18n.t('common.loadFailed') }}</p>
        <button mat-stroked-button type="button" data-test="retry" (click)="load()">{{ i18n.t('common.retry') }}</button>
      } @else {
        <p role="status">{{ i18n.t('common.loading') }}</p>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header,
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .job,
    .call-to-action {
      margin-bottom: 16px;
      padding: 16px;
    }
    h2 {
      margin: 0;
    }
    .meta {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .language {
      margin-left: 8px;
      padding: 0 6px;
      border-radius: 6px;
      background: var(--mat-sys-secondary-container);
    }
    .resume {
      display: flex;
      align-items: center;
      gap: 8px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      margin-top: 8px;
      padding-top: 8px;
    }
    .resume span {
      flex: 1;
    }
  `,
})
export class Dashboard {
  protected readonly i18n = inject(I18n);
  private readonly http = inject(HttpClient);
  private readonly confirmDialog = inject(ConfirmDialog);

  protected readonly jobs = signal<JobSummary[]>([]);
  protected readonly resumes = signal<ResumeSummary[]>([]);
  protected readonly profile = signal<StoredProfile | null>(null);
  protected readonly loaded = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly profileEmpty = computed(() => !this.profile()?.data?.experiences?.length);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    forkJoin({
      jobs: this.http.get<JobSummary[]>('/api/jobs'),
      resumes: this.http.get<ResumeSummary[]>('/api/resumes'),
      profile: this.http.get<StoredProfile>('/api/profile'),
    }).subscribe({
      next: ({ jobs, resumes, profile }) => {
        this.jobs.set(jobs);
        this.resumes.set(resumes);
        this.profile.set(profile);
        this.loaded.set(true);
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected resumesOf(jobId: string | null | undefined): ResumeSummary[] {
    return this.resumes().filter((resume) => resume.jobId === jobId);
  }

  protected async deleteJob(job: JobSummary): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('dashboard.confirmDeleteTitle'),
      text: this.i18n.t('dashboard.confirmDelete', { title: job.title ?? '' }),
      confirmLabel: this.i18n.t('common.remove'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    await firstValueFrom(this.http.delete(`/api/jobs/${job.id}`));
    this.jobs.update((jobs) => jobs.filter((existing) => existing.id !== job.id));
    this.resumes.update((resumes) => resumes.filter((resume) => resume.jobId !== job.id));
  }

  protected async deleteResume(resume: ResumeSummary): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/resumes/${resume.id}`));
    this.resumes.update((resumes) => resumes.filter((existing) => existing.id !== resume.id));
  }

  protected async download(resume: ResumeSummary): Promise<void> {
    const pdf = await firstValueFrom(this.http.get(`/api/resumes/${resume.id}/pdf`, { responseType: 'blob' }));
    downloadBlob(pdf, `resume-${(resume.language ?? 'pt').toLowerCase()}.pdf`);
  }
}
