import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import type {
  Achievement,
  Education,
  Experience,
  LanguageSkill,
  LocalizedText,
  Personal,
  Profile,
  Project,
  SkillCategory,
} from '../core/api/types';
import { applyServerErrors } from '../core/forms/validators';
import { nextId } from './ids';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export type LocalizedForm = FormGroup<{ pt: FormControl<string>; en: FormControl<string> }>;
export type PersonalForm = FormGroup<{
  name: FormControl<string>;
  title: LocalizedForm;
  location: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  linkedin: FormControl<string>;
  github: FormControl<string>;
}>;
export type AchievementForm = FormGroup<{
  id: FormControl<string>;
  text: LocalizedForm;
  skills: FormControl<string[]>;
}>;
export type ExperienceForm = FormGroup<{
  id: FormControl<string>;
  company: FormControl<string>;
  role: LocalizedForm;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
  achievements: FormArray<AchievementForm>;
}>;
export type ProjectForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  description: LocalizedForm;
  skills: FormControl<string[]>;
  url: FormControl<string>;
}>;
export type EducationForm = FormGroup<{
  id: FormControl<string>;
  institution: FormControl<string>;
  degree: LocalizedForm;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}>;
export type CategoryForm = FormGroup<{
  id: FormControl<string>;
  name: LocalizedForm;
  skills: FormControl<string[]>;
}>;
export type LanguageForm = FormGroup<{ name: LocalizedForm; level: LocalizedForm }>;
export type ProfileForm = FormGroup<{
  personal: PersonalForm;
  summary: LocalizedForm;
  skillCategories: FormArray<CategoryForm>;
  experiences: FormArray<ExperienceForm>;
  projects: FormArray<ProjectForm>;
  education: FormArray<EducationForm>;
  languages: FormArray<LanguageForm>;
}>;

// --- building ------------------------------------------------------------

function text(value: string | null | undefined, required = false): FormControl<string> {
  return new FormControl(value ?? '', { nonNullable: true, validators: required ? [Validators.required] : [] });
}

function month(value: string | null | undefined, required: boolean): FormControl<string> {
  const validators = [Validators.pattern(MONTH)];
  return new FormControl(value ?? '', {
    nonNullable: true,
    validators: required ? [Validators.required, ...validators] : validators,
  });
}

function skills(value: string[] | undefined): FormControl<string[]> {
  return new FormControl([...(value ?? [])], { nonNullable: true });
}

/** Portuguese is required where the backend requires it; English is always optional. */
function localized(value: LocalizedText | null | undefined, required = false): LocalizedForm {
  return new FormGroup({ pt: text(value?.pt, required), en: text(value?.en) });
}

function personalForm(value: Personal | null | undefined): PersonalForm {
  return new FormGroup({
    name: text(value?.name, true),
    title: localized(value?.title, true),
    location: text(value?.location),
    email: text(value?.email),
    phone: text(value?.phone),
    linkedin: text(value?.linkedin),
    github: text(value?.github),
  });
}

function achievementForm(value: Achievement): AchievementForm {
  return new FormGroup({ id: text(value.id), text: localized(value.text, true), skills: skills(value.skills) });
}

function experienceForm(value: Experience): ExperienceForm {
  return new FormGroup({
    id: text(value.id),
    company: text(value.company, true),
    role: localized(value.role, true),
    startDate: month(value.startDate, true),
    endDate: month(value.endDate, false),
    achievements: new FormArray((value.achievements ?? []).map(achievementForm)),
  });
}

function projectForm(value: Project): ProjectForm {
  return new FormGroup({
    id: text(value.id),
    name: text(value.name, true),
    description: localized(value.description, true),
    skills: skills(value.skills),
    url: text(value.url),
  });
}

function educationForm(value: Education): EducationForm {
  return new FormGroup({
    id: text(value.id),
    institution: text(value.institution, true),
    degree: localized(value.degree, true),
    startDate: month(value.startDate, false),
    endDate: month(value.endDate, false),
  });
}

function categoryForm(value: SkillCategory): CategoryForm {
  return new FormGroup({ id: text(value.id), name: localized(value.name, true), skills: skills(value.skills) });
}

function languageForm(value: LanguageSkill): LanguageForm {
  return new FormGroup({ name: localized(value.name, true), level: localized(value.level) });
}

export function buildProfileForm(profile: Profile): ProfileForm {
  return new FormGroup({
    personal: personalForm(profile.personal),
    summary: localized(profile.summary),
    skillCategories: new FormArray((profile.skillCategories ?? []).map(categoryForm)),
    experiences: new FormArray((profile.experiences ?? []).map(experienceForm)),
    projects: new FormArray((profile.projects ?? []).map(projectForm)),
    education: new FormArray((profile.education ?? []).map(educationForm)),
    languages: new FormArray((profile.languages ?? []).map(languageForm)),
  });
}

// --- new items -------------------------------------------------------------

export const newAchievement = (): AchievementForm => achievementForm({ id: nextId('ach'), skills: [] });

/** A new job comes with its first, empty bullet ready to type into. */
export function newExperience(): ExperienceForm {
  const form = experienceForm({ id: nextId('exp'), company: '', startDate: '', achievements: [] });
  form.controls.achievements.push(newAchievement());
  return form;
}

export const newProject = (): ProjectForm => projectForm({ id: nextId('prj'), name: '', skills: [], url: null });
export const newEducation = (): EducationForm => educationForm({ id: nextId('edu'), institution: '' });
export const newCategory = (): CategoryForm => categoryForm({ id: nextId('cat'), skills: [] });
export const newLanguage = (): LanguageForm => languageForm({});

// --- reading back ----------------------------------------------------------

const trimmed = (value: string): string => value.trim();
const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

function toLocalized(form: LocalizedForm): LocalizedText {
  return { pt: trimmed(form.controls.pt.value), en: orNull(form.controls.en.value) };
}

/** The profile as the API expects it: trimmed text, null for blank optional values. */
export function toProfile(form: ProfileForm): Profile {
  const { personal, summary } = form.controls;
  return {
    personal: {
      name: trimmed(personal.controls.name.value),
      title: toLocalized(personal.controls.title),
      location: trimmed(personal.controls.location.value),
      email: trimmed(personal.controls.email.value),
      phone: trimmed(personal.controls.phone.value),
      linkedin: trimmed(personal.controls.linkedin.value),
      github: trimmed(personal.controls.github.value),
    },
    summary: toLocalized(summary),
    skillCategories: form.controls.skillCategories.controls.map((category) => ({
      id: category.controls.id.value,
      name: toLocalized(category.controls.name),
      skills: category.controls.skills.value,
    })),
    experiences: form.controls.experiences.controls.map((experience) => ({
      id: experience.controls.id.value,
      company: trimmed(experience.controls.company.value),
      role: toLocalized(experience.controls.role),
      startDate: trimmed(experience.controls.startDate.value),
      endDate: orNull(experience.controls.endDate.value),
      achievements: experience.controls.achievements.controls.map((achievement) => ({
        id: achievement.controls.id.value,
        text: toLocalized(achievement.controls.text),
        skills: achievement.controls.skills.value,
      })),
    })),
    projects: form.controls.projects.controls.map((project) => ({
      id: project.controls.id.value,
      name: trimmed(project.controls.name.value),
      description: toLocalized(project.controls.description),
      skills: project.controls.skills.value,
      url: orNull(project.controls.url.value),
    })),
    education: form.controls.education.controls.map((education) => ({
      id: education.controls.id.value,
      institution: trimmed(education.controls.institution.value),
      degree: toLocalized(education.controls.degree),
      startDate: orNull(education.controls.startDate.value),
      endDate: orNull(education.controls.endDate.value),
    })),
    languages: form.controls.languages.controls.map((language) => ({
      name: toLocalized(language.controls.name),
      level: toLocalized(language.controls.level),
    })),
  };
}

// --- server feedback -------------------------------------------------------

/**
 * Puts the backend's 422 errors on their controls. An error inside a list
 * value (a skill in a skills list) lands on the list's control. Returns the
 * paths no control could take, for a form-level message.
 */
export function applyProfileErrors(form: ProfileForm, errors: { path?: string; message?: string }[]): string[] {
  const byPath = new Map<string, string>();
  for (const error of errors) {
    if (error.path) {
      byPath.set(nearestControlPath(form, error.path), error.message ?? '');
    }
  }
  return applyServerErrors(form, byPath);
}

function nearestControlPath(form: ProfileForm, path: string): string {
  let candidate = path;
  while (candidate.includes('.') || candidate.includes('[')) {
    if (form.get(candidate.replace(/\[(\d+)\]/g, '.$1'))) {
      return candidate;
    }
    candidate = candidate.replace(/(\.[^.[\]]+|\[\d+\])$/, '');
  }
  return path;
}

export type ProfileSection =
  | 'personal'
  | 'summary'
  | 'skillCategories'
  | 'experiences'
  | 'projects'
  | 'education'
  | 'languages';

const lacksEnglish = (value: LocalizedText | null | undefined): boolean => !!value?.pt?.trim() && !value.en?.trim();
const count = (values: (LocalizedText | null | undefined)[]): number => values.filter(lacksEnglish).length;

/** Per section, the free-text fields with Portuguese but no English (they fall back to Portuguese). */
export function missingEnglishBySection(profile: Profile): Record<ProfileSection, number> {
  return {
    personal: count([profile.personal?.title]),
    summary: count([profile.summary]),
    skillCategories: count((profile.skillCategories ?? []).map((category) => category.name)),
    experiences: count(
      (profile.experiences ?? []).flatMap((experience) => [
        experience.role,
        ...(experience.achievements ?? []).map((achievement) => achievement.text),
      ]),
    ),
    projects: count((profile.projects ?? []).map((project) => project.description)),
    education: count((profile.education ?? []).map((education) => education.degree)),
    languages: count((profile.languages ?? []).flatMap((language) => [language.name, language.level])),
  };
}

export function missingEnglish(profile: Profile): number {
  return Object.values(missingEnglishBySection(profile)).reduce((total, value) => total + value, 0);
}
