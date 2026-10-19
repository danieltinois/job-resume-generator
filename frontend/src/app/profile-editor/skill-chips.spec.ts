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
});
