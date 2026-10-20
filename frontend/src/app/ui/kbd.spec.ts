import { TestBed } from '@angular/core/testing';
import { Kbd, PLATFORM_IS_APPLE } from './kbd';


describe('Kbd', () => {
  function render(keys: string, apple: boolean): string {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_IS_APPLE, useValue: apple }] });
    const fixture = TestBed.createComponent(Kbd);
    fixture.componentRef.setInput('keys', keys);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('kbd')!.textContent!.trim();
  }

  it('shows the command key on Apple platforms', () => {
    expect(render('Mod+S', true)).toBe('⌘S');
  });

  it('shows Ctrl elsewhere', () => {
    expect(render('Mod+S', false)).toBe('Ctrl+S');
  });

  it('shows the return arrow for Enter on Apple platforms only', () => {
    expect(render('Mod+Enter', true)).toBe('⌘↵');
  });

  it('spells Enter out elsewhere', () => {
    expect(render('Mod+Enter', false)).toBe('Ctrl+Enter');
  });
});
