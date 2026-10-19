import { SelectionState } from './selection-state';

const SUGGESTION = {
  experienceOrder: ['exp_a', 'exp_b'],
  achievements: { exp_a: ['ach_1', 'ach_2'], exp_b: ['ach_3'] },
  projects: ['prj_1'],
  skillOrder: { cat_1: ['Java', 'SQL', 'AWS'] },
};

describe('SelectionState', () => {
  let state: SelectionState;

  beforeEach(() => {
    state = new SelectionState();
    state.reset(SUGGESTION);
  });

  it('hiding an experience drops its achievements key', () => {
    state.toggleExperience('exp_b');

    expect(state.selection().experienceOrder).toEqual(['exp_a']);
    expect(state.selection().achievements).not.toHaveProperty('exp_b');
  });

  it('showing an experience again adds it with no bullets yet', () => {
    state.toggleExperience('exp_b');
    state.toggleExperience('exp_b');

    expect(state.selection().experienceOrder).toEqual(['exp_a', 'exp_b']);
    expect(state.selection().achievements['exp_b']).toEqual([]);
  });

  it('ticking a bullet of a hidden experience shows the experience', () => {
    state.toggleExperience('exp_b');

    state.toggleAchievement('exp_b', 'ach_3');

    expect(state.selection().experienceOrder).toContain('exp_b');
    expect(state.selection().achievements['exp_b']).toEqual(['ach_3']);
  });

  it('toggles and moves achievements', () => {
    state.toggleAchievement('exp_a', 'ach_1');
    expect(state.selection().achievements['exp_a']).toEqual(['ach_2']);

    state.toggleAchievement('exp_a', 'ach_1');
    state.moveAchievement('exp_a', 1, 0);
    expect(state.selection().achievements['exp_a']).toEqual(['ach_1', 'ach_2']);
  });

  it('toggles projects and moves skills', () => {
    state.toggleProject('prj_1');
    state.moveSkill('cat_1', 2, 0);

    expect(state.selection().projects).toEqual([]);
    expect(state.selection().skillOrder['cat_1']).toEqual(['AWS', 'Java', 'SQL']);
  });

  it('restores the suggestion', () => {
    state.toggleExperience('exp_a');
    state.toggleProject('prj_1');

    state.restore();

    expect(state.selection()).toEqual(SUGGESTION);
  });

  it('never mutates the selection it handed out', () => {
    const before = state.selection();

    state.toggleAchievement('exp_a', 'ach_1');

    expect(before.achievements['exp_a']).toEqual(['ach_1', 'ach_2']);
  });
});
