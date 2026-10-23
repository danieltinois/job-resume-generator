import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { SkillChips } from './skill-chips';

describe('SkillChips', () => {
  function render(skills: string[]) {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'en' }] });
    const fixture = TestBed.createComponent(SkillChips);
    const control = new FormControl(skills, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('label', 'Skills');
    fixture.componentRef.setInput('terms', [
      { canonical: 'PostgreSQL', aliases: ['postgres', 'psql'] },
      { canonical: 'Kubernetes', aliases: ['k8s'] },
    ]);
    fixture.componentRef.setInput('extra', ['Typst']);
    fixture.detectChanges();
    return { fixture, control, component: fixture.componentInstance };
  }

  it('suggests a tech term by the start of its name or alias', () => {
    const { component } = render([]);

    component.query.set('postg');
    expect(component.options()).toEqual(['PostgreSQL']);

    component.query.set('k8');
    expect(component.options()).toEqual(['Kubernetes']);
  });

  it('also suggests the user\'s own skills, without ones already chosen', () => {
    const { component } = render(['PostgreSQL']);

    component.query.set('');

    expect(component.options()).toEqual(['Kubernetes', 'Typst']);
  });

  it('adds and removes skills without duplicates', () => {
    const { component, control } = render(['Java']);

    component.add('PostgreSQL');
    component.add('postgresql');
    component.add('  ');
    component.remove('Java');

    expect(control.value).toEqual(['PostgreSQL']);
  });

  it('keeps the text input outside the chip grid, whose only children are the chip rows', () => {
    const { fixture } = render(['Java', 'SQL']);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const grid = element.querySelector('[role="grid"]')!;

    expect(grid.querySelectorAll('[role="row"]')).toHaveLength(2);
    expect(grid.querySelector('input')).toBeNull();
    expect(element.querySelector('input')).not.toBeNull();
  });

  it('still adds a skill typed in the input when Enter is pressed, and removes one with its button', () => {
    const { fixture, control } = render(['Java']);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;

    input.value = 'Go';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(control.value).toEqual(['Java', 'Go']);
    expect(input.value).toBe('');

    element.querySelector<HTMLButtonElement>('button[aria-label="Remove Java"]')!.click();
    expect(control.value).toEqual(['Go']);
  });
});
