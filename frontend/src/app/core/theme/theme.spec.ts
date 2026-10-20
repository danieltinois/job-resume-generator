import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  // Spec files share one localStorage (no isolation), so the remembered
  // choice must not outlive these tests.
  const forgetChoice = () => {
    try {
      localStorage.removeItem('ui-theme');
    } catch {
      // storage unavailable: fine
    }
  };
  beforeEach(forgetChoice);
  afterEach(() => {
    forgetChoice();
    vi.restoreAllMocks();
  });

  it('defaults to system', () => {
    const theme = TestBed.inject(Theme);
    TestBed.tick();

    expect(theme.mode()).toBe('system');
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('remembers the choice', () => {
    TestBed.inject(Theme).set('dark');
    TestBed.tick();

    expect(localStorage.getItem('ui-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    TestBed.resetTestingModule();

    expect(TestBed.inject(Theme).mode()).toBe('dark');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem('ui-theme', 'sepia');

    expect(TestBed.inject(Theme).mode()).toBe('system');
  });

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const theme = TestBed.inject(Theme);

    expect(theme.mode()).toBe('system');

    theme.set('light');
    TestBed.tick();

    expect(theme.mode()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
