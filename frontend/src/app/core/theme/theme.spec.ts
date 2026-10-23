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

  describe('browser bar colour', () => {
    let light: HTMLMetaElement;
    let dark: HTMLMetaElement;

    // The two metas of index.html.
    beforeEach(() => {
      light = document.createElement('meta');
      dark = document.createElement('meta');
      for (const [meta, color, scheme] of [
        [light, '#fafafa', 'light'],
        [dark, '#09090b', 'dark'],
      ] as const) {
        meta.name = 'theme-color';
        meta.content = color;
        meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`);
        document.head.appendChild(meta);
      }
    });
    afterEach(() => {
      light.remove();
      dark.remove();
    });

    const colors = () => [light.content, dark.content];

    it('keeps each scheme its own colour on system', () => {
      TestBed.inject(Theme);
      TestBed.tick();

      expect(colors()).toEqual(['#fafafa', '#09090b']);
    });

    it('follows an explicit choice whichever scheme the system prefers', () => {
      const theme = TestBed.inject(Theme);

      theme.set('dark');
      TestBed.tick();
      expect(colors()).toEqual(['#09090b', '#09090b']);

      theme.set('light');
      TestBed.tick();
      expect(colors()).toEqual(['#fafafa', '#fafafa']);

      theme.set('system');
      TestBed.tick();
      expect(colors()).toEqual(['#fafafa', '#09090b']);
    });

    it('applies the saved choice as soon as the service exists', () => {
      localStorage.setItem('ui-theme', 'dark');

      TestBed.inject(Theme);

      expect(colors()).toEqual(['#09090b', '#09090b']);
    });
  });
});
