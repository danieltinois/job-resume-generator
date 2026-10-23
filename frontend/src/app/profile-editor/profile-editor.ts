import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { Profile, StoredProfile, TechTerm } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import { downloadBlob } from '../core/download';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';
import { Shortcuts } from '../core/shortcuts/shortcuts';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Kbd } from '../ui/kbd';
import { PageHeader } from '../ui/page-header';
import { Skeleton } from '../ui/skeleton';
import { StatusPill } from '../ui/status-pill';
import { Autosave, type ConflictChoice, type SaveStatus } from './autosave';
import { ConflictDialog } from './conflict-dialog';
import { ExperienceCard } from './experience-card';
import { ImportDialog } from './import-dialog';
import { type EditLanguage, LocalizedField } from './localized-field';
import {
  type ProfileForm,
  type ProfileSection,
  buildProfileForm,
  missingEnglishBySection,
  newCategory,
  newEducation,
  newExperience,
  newLanguage,
  newProject,
  toProfile,
} from './profile-form';
import { type SectionStatus, SectionNav } from './section-nav';
import { SkillChips } from './skill-chips';

const SECTIONS: ProfileSection[] = [
  'personal',
  'summary',
  'skillCategories',
  'experiences',
  'projects',
  'education',
  'languages',
];

@Component({
  selector: 'app-profile-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    PageHeader,
    StatusPill,
    Kbd,
    Skeleton,
    LocalizedField,
    SkillChips,
    ExperienceCard,
    SectionNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-editor.html',
  styleUrl: './profile-editor.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ProfileEditor {
  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialog);
  private readonly current = signal<Autosave | null>(null);

  /** The form, once the profile has loaded. */
  readonly form = signal<ProfileForm | null>(null);
  /** The version the next save must send back (optimistic locking). */
  readonly version = signal(0);
  /** The profile as last edited, for badges and suggestions. */
  readonly value = signal<Profile | null>(null);

  protected readonly status = computed<SaveStatus>(() => this.current()?.status() ?? 'idle');
  protected readonly statusTone = computed<'neutral' | 'accent' | 'warn' | 'danger'>(() => {
    switch (this.status()) {
      case 'saved':
        return 'accent';
      case 'unsaved':
        return 'warn';
      case 'invalid':
      case 'error':
      case 'conflict':
        return 'danger';
      default:
        return 'neutral';
    }
  });
  protected readonly mode = signal<EditLanguage>('pt');
  protected readonly expanded = signal<string | null>(null);
  protected readonly terms = toSignal(
    this.http.get<TechTerm[]>('/api/tech-terms').pipe(catchError(() => of([] as TechTerm[]))),
    { initialValue: [] as TechTerm[] },
  );

  /** The user's own skills, offered alongside the tech terms. */
  protected readonly ownSkills = computed(() => {
    const profile = this.value();
    const skills = new Set<string>();
    profile?.skillCategories?.forEach((category) => category.skills?.forEach((skill) => skills.add(skill)));
    return [...skills];
  });

  protected readonly sections = computed<SectionStatus[]>(() => {
    const profile = this.value();
    const form = this.form();
    const missing = profile ? missingEnglishBySection(profile) : null;
    return SECTIONS.map((key) => ({
      key,
      label: this.i18n.t(`profile.section.${key}`),
      missingEnglish: missing?.[key] ?? 0,
      invalid: !!form && form.controls[key].invalid && form.controls[key].touched,
    }));
  });

  constructor() {
    this.http
      .get<StoredProfile>('/api/profile')
      .pipe(takeUntilDestroyed())
      .subscribe((stored) => this.load(stored));
    this.destroyRef.onDestroy(() => this.current()?.stop());
    inject(Shortcuts).register(
      { key: 's', mod: true, description: 'shortcuts.save', handler: () => void this.current()?.saveNow() },
      this.destroyRef,
    );
  }

  /** Replaces the form with a profile from the server (initial load, conflict reload, import). */
  load(stored: StoredProfile): void {
    this.current()?.stop();
    const form = buildProfileForm(stored.data ?? {});
    this.version.set(stored.version ?? 0);
    this.form.set(form);
    this.value.set(toProfile(form));
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.value.set(toProfile(form)));

    const autosave = new Autosave(this.http, form, this.version, {
      resolveConflict: () => this.askConflict(),
      reload: (latest) => this.load(latest),
    });
    autosave.start();
    this.current.set(autosave);
  }

  /**
   * Called by the route guard before leaving: saves what is pending and asks
   * before abandoning edits that could not be saved (invalid, or no session).
   */
  async canLeave(): Promise<boolean> {
    const autosave = this.current();
    if (!autosave) {
      return true;
    }
    if (this.auth.isSignedIn()) {
      await autosave.flush();
    }
    return (
      !autosave.hasUnsavedChanges() ||
      this.confirmDialog.confirm({
        title: this.i18n.t('profile.leave.title'),
        text: this.i18n.t('profile.leave.confirm'),
        confirmLabel: this.i18n.t('profile.leave.action'),
        destructive: true,
      })
    );
  }

  /** Closing or reloading the tab cannot wait for a save: the browser asks instead. */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.current()?.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  protected async openImport(): Promise<void> {
    const imported = await firstValueFrom(
      this.dialog.open(ImportDialog, { width: '480px', maxWidth: '92vw' }).afterClosed(),
    );
    if (imported) {
      // A save still in flight would bump the version under the import's save and fake a conflict.
      await this.current()?.settle();
      // Keep the version: the import replaces the content, and the save that follows must still be current.
      this.load({ version: this.version(), data: imported });
      this.form()?.markAsDirty();
      await this.current()?.saveNow();
    }
  }

  protected async exportProfile(): Promise<void> {
    downloadBlob(await firstValueFrom(this.http.get('/api/profile/export', { responseType: 'blob' })), 'profile.json');
  }

  private async askConflict(): Promise<ConflictChoice> {
    const choice = await firstValueFrom(
      this.dialog.open<ConflictDialog, unknown, ConflictChoice>(ConflictDialog, {
        disableClose: true,
        width: '480px',
        maxWidth: '92vw',
      }).afterClosed(),
    );
    return choice ?? 'keep';
  }

  protected toggle(id: string): void {
    this.expanded.update((current) => (current === id ? null : id));
  }

  protected addExperience(form: ProfileForm): void {
    const experience = newExperience();
    form.controls.experiences.insert(0, experience);
    this.expanded.set(experience.controls.id.value);
  }

  protected add(list: FormArray, kind: 'project' | 'education' | 'category' | 'language'): void {
    const factories = { project: newProject, education: newEducation, category: newCategory, language: newLanguage };
    list.push(factories[kind]());
  }

  protected removeAt(list: FormArray, index: number): void {
    list.removeAt(index);
  }
}
