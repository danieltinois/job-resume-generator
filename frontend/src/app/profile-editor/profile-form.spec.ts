import type { Profile } from '../core/api/types';
import example from '../../testing/profile-example.json';
import {
  applyProfileErrors,
  buildProfileForm,
  missingEnglish,
  newAchievement,
  newCategory,
  newEducation,
  newExperience,
  newProject,
  toProfile,
} from './profile-form';

const EXAMPLE = example as Profile;

describe('profile form', () => {
  it('round-trips the example profile', () => {
    expect(toProfile(buildProfileForm(EXAMPLE))).toEqual(EXAMPLE);
  });

  it('turns empty English and optional fields into null', () => {
    const form = buildProfileForm(EXAMPLE);
    form.controls.summary.controls.en.setValue('   ');
    form.controls.experiences.at(0).controls.endDate.setValue('');
    form.controls.projects.at(0).controls.url.setValue('');

    const profile = toProfile(form);

    expect(profile.summary?.en).toBeNull();
    expect(profile.experiences?.[0].endDate).toBeNull();
    expect(profile.projects?.[0].url).toBeNull();
  });

  it('trims text', () => {
    const form = buildProfileForm(EXAMPLE);
    form.controls.personal.controls.name.setValue('  Alex  ');

    expect(toProfile(form).personal?.name).toBe('Alex');
  });

  it('gives new items backend-format ids', () => {
    expect(newExperience().controls.id.value).toMatch(/^exp_[0-9a-f]{8}$/);
    expect(newAchievement().controls.id.value).toMatch(/^ach_[0-9a-f]{8}$/);
    expect(newProject().controls.id.value).toMatch(/^prj_[0-9a-f]{8}$/);
    expect(newEducation().controls.id.value).toMatch(/^edu_[0-9a-f]{8}$/);
    expect(newCategory().controls.id.value).toMatch(/^cat_[0-9a-f]{8}$/);
  });

  it('starts a new experience with one empty bullet', () => {
    expect(newExperience().controls.achievements.length).toBe(1);
  });

  it('puts server error paths on the right control', () => {
    const form = buildProfileForm(EXAMPLE);

    const unmatched = applyProfileErrors(form, [
      { path: 'experiences[0].achievements[2].text.pt', message: 'is required' },
      { path: 'personal.name', message: 'is required' },
    ]);

    expect(unmatched).toEqual([]);
    expect(form.get('experiences.0.achievements.2.text.pt')?.errors).toEqual({ server: 'is required' });
    expect(form.controls.personal.controls.name.errors).toEqual({ server: 'is required' });
  });

  it('puts an error inside a list value on the list control', () => {
    const form = buildProfileForm(EXAMPLE);

    applyProfileErrors(form, [{ path: 'skillCategories[0].skills[1]', message: 'must not be empty' }]);

    expect(form.get('skillCategories.0.skills')?.errors).toEqual({ server: 'must not be empty' });
  });

  it('returns paths that match no control', () => {
    const form = buildProfileForm(EXAMPLE);

    expect(applyProfileErrors(form, [{ path: 'nowhere[3]', message: 'x' }])).toEqual(['nowhere[3]']);
  });

  it('counts free-text fields without English', () => {
    const form = buildProfileForm(EXAMPLE);
    expect(missingEnglish(toProfile(form))).toBe(0);

    form.controls.summary.controls.en.setValue('');
    form.controls.experiences.at(0).controls.achievements.at(0).controls.text.controls.en.setValue('');

    expect(missingEnglish(toProfile(form))).toBe(2);
  });

  it('flags required fields client-side', () => {
    const form = buildProfileForm(EXAMPLE);
    form.controls.experiences.at(0).controls.company.setValue('');
    form.controls.experiences.at(0).controls.startDate.setValue('2023/02');

    expect(form.controls.experiences.at(0).controls.company.hasError('required')).toBe(true);
    expect(form.controls.experiences.at(0).controls.startDate.hasError('pattern')).toBe(true);
  });
});
