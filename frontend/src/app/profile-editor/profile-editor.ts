import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, of } from 'rxjs';
import type { Profile, StoredProfile, TechTerm } from '../core/api/types';
import { fieldError } from '../core/forms/field-error';
import { I18n } from '../core/i18n/i18n';
import { ExperienceCard } from './experience-card';
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
    MatInputModule,
    LocalizedField,
    SkillChips,
    ExperienceCard,
    SectionNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-editor.html',
  styleUrl: './profile-editor.scss',
})
export class ProfileEditor {
  protected readonly i18n = inject(I18n);
  protected readonly fieldError = fieldError;
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  /** The form, once the profile has loaded. */
  readonly form = signal<ProfileForm | null>(null);
  /** The version the next save must send back (optimistic locking). */
  readonly version = signal(0);
  /** The profile as last edited, for badges and suggestions. */
  readonly value = signal<Profile | null>(null);

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
  }

  /** Replaces the form with a profile from the server (initial load, conflict reload, import). */
  load(stored: StoredProfile): void {
    const form = buildProfileForm(stored.data ?? {});
    this.version.set(stored.version ?? 0);
    this.form.set(form);
    this.value.set(toProfile(form));
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.value.set(toProfile(form)));
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
