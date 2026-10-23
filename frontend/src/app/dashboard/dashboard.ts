import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild, type ElementRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import type { JobSummary, ResumeSummary, StoredProfile } from '../core/api/types';
import { downloadBlob } from '../core/download';
import { I18n } from '../core/i18n/i18n';
import { Shortcuts } from '../core/shortcuts/shortcuts';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { EmptyState } from '../ui/empty-state';
import { Kbd } from '../ui/kbd';
import { PageHeader } from '../ui/page-header';
import { Skeleton } from '../ui/skeleton';
import { StatusPill } from '../ui/status-pill';
import { filterJobs } from './job-filter';

/** Home: every pasted job with the resumes generated for it, searchable by title and company. */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    PageHeader,
    EmptyState,
    Skeleton,
    StatusPill,
    Kbd,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly i18n = inject(I18n);
  private readonly http = inject(HttpClient);
  private readonly confirmDialog = inject(ConfirmDialog);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly jobs = signal<JobSummary[]>([]);
  protected readonly resumes = signal<ResumeSummary[]>([]);
  protected readonly profile = signal<StoredProfile | null>(null);
  protected readonly loaded = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly profileEmpty = computed(() => !this.profile()?.data?.experiences?.length);
  protected readonly query = signal('');
  protected readonly visibleJobs = computed(() => filterJobs(this.jobs(), this.query()));
  protected readonly summary = computed(() =>
    this.i18n.t('dashboard.count', {
      jobs: this.i18n.t(this.jobs().length === 1 ? 'dashboard.jobsOne' : 'dashboard.jobsMany', { n: this.jobs().length }),
      resumes: this.i18n.t(this.resumes().length === 1 ? 'dashboard.generatedOne' : 'dashboard.generatedMany', {
        n: this.resumes().length,
      }),
    }),
  );

  constructor() {
    inject(Shortcuts).register(
      { key: '/', description: 'shortcuts.search', handler: () => this.searchInput()?.nativeElement.focus() },
      inject(DestroyRef),
    );
    this.load();
  }

  protected resumeCount(count: number): string {
    return this.i18n.t(count === 1 ? 'dashboard.resumesOne' : 'dashboard.resumesMany', { n: count });
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
