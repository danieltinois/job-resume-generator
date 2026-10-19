import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { filter, firstValueFrom, forkJoin } from 'rxjs';
import type {
  Achievement,
  Analysis,
  Experience,
  Language,
  LocalizedText,
  Profile,
  ResumeRequest,
  StoredJob,
  StoredProfile,
} from '../core/api/types';
import { downloadBlob } from '../core/download';
import { I18n } from '../core/i18n/i18n';
import { Preview } from './preview';
import { SelectionState } from './selection-state';

@Component({
  selector: 'app-job-review',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-review.html',
  styleUrl: './job-review.scss',
})
export class JobReview implements OnInit {
  /** The job id, from the route. */
  readonly id = input.required<string>();

  protected readonly i18n = inject(I18n);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = new SelectionState();
  protected readonly job = signal<StoredJob | null>(null);
  protected readonly profile = signal<Profile | null>(null);
  protected readonly analysis = signal<Analysis | null>(null);
  protected readonly language = signal<Language>('PT');
  protected readonly saved = signal<{ id: string; warnings: string[] } | null>(null);
  protected readonly saving = signal(false);

  private readonly request = computed<ResumeRequest | null>(() =>
    this.analysis() ? { jobId: this.id(), language: this.language(), selection: this.state.selection() } : null,
  );
  protected readonly preview = new Preview(
    this.http,
    toObservable(this.request).pipe(filter((request): request is ResumeRequest => request !== null)),
  );
  protected readonly previewUrl = computed(() => {
    const url = this.preview.url();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /** Experiences in resume order first, then the hidden ones in profile order. */
  protected readonly experiences = computed(() => {
    const all = this.profile()?.experiences ?? [];
    const order = this.state.selection().experienceOrder;
    const shown = order.map((id) => all.find((experience) => experience.id === id)).filter((e) => !!e);
    return [...shown, ...all.filter((experience) => !order.includes(experience.id ?? ''))] as Experience[];
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.preview.stop());
  }

  ngOnInit(): void {
    forkJoin({
      job: this.http.get<StoredJob>(`/api/jobs/${this.id()}`),
      profile: this.http.get<StoredProfile>('/api/profile'),
      analysis: this.http.get<Analysis>(`/api/jobs/${this.id()}/analysis`),
    }).subscribe(({ job, profile, analysis }) => {
      this.job.set(job);
      this.profile.set(profile.data ?? null);
      this.language.set(analysis.language ?? 'PT');
      this.state.reset(analysis.suggestion);
      this.analysis.set(analysis);
    });
  }

  /** Changes the resume language; the selection stays, the warnings are recomputed. */
  setLanguage(language: Language): void {
    this.language.set(language);
    this.saved.set(null);
    this.http
      .get<Analysis>(`/api/jobs/${this.id()}/analysis`, { params: { lang: language } })
      .subscribe((analysis) => this.analysis.set(analysis));
  }

  protected text(value: LocalizedText | null | undefined): string {
    return (this.language() === 'EN' ? value?.en || value?.pt : value?.pt) ?? '';
  }

  /** Bullets of one experience: selected ones in resume order, then the rest in profile order. */
  protected achievementsOf(experience: Experience): Achievement[] {
    const all = experience.achievements ?? [];
    const order = this.state.selection().achievements[experience.id ?? ''] ?? [];
    const chosen = order.map((id) => all.find((achievement) => achievement.id === id)).filter((a) => !!a);
    return [...chosen, ...all.filter((achievement) => !order.includes(achievement.id ?? ''))] as Achievement[];
  }

  protected isChosen(experience: Experience, achievement: Achievement): boolean {
    return (this.state.selection().achievements[experience.id ?? ''] ?? []).includes(achievement.id ?? '');
  }

  protected positionOf(experience: Experience, achievement: Achievement): number {
    return (this.state.selection().achievements[experience.id ?? ''] ?? []).indexOf(achievement.id ?? '');
  }

  protected score(achievement: Achievement): number {
    return this.analysis()?.scores?.[achievement.id ?? ''] ?? 0;
  }

  protected async save(): Promise<void> {
    const request = this.request();
    if (!request) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.http.post<{ id: string; warnings: string[] }>('/api/resumes', request));
      this.saved.set(saved);
    } finally {
      this.saving.set(false);
    }
  }

  protected async download(): Promise<void> {
    const saved = this.saved();
    if (saved) {
      const pdf = await firstValueFrom(this.http.get(`/api/resumes/${saved.id}/pdf`, { responseType: 'blob' }));
      downloadBlob(pdf, `resume-${this.language().toLowerCase()}.pdf`);
    }
  }
}
