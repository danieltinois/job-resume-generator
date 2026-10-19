import { TestBed } from '@angular/core/testing';
import type { Profile } from '../core/api/types';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import example from '../../testing/profile-example.json';
import { ExperienceCard } from './experience-card';
import { buildProfileForm } from './profile-form';

describe('ExperienceCard', () => {
  function render(expanded: boolean) {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'en' }] });
    const fixture = TestBed.createComponent(ExperienceCard);
    fixture.componentRef.setInput('experience', buildProfileForm(example as Profile).controls.experiences.at(0));
    fixture.componentRef.setInput('mode', 'pt');
    fixture.componentRef.setInput('expanded', expanded);
    fixture.componentRef.setInput('suggestions', []);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders no form controls while collapsed', () => {
    const element = render(false);

    expect(element.querySelectorAll('input, textarea').length).toBe(0);
    expect(element.textContent).toContain('Example Payments');
    expect(element.textContent).toContain('Engenheiro Backend Sênior');
  });

  it('renders the fields and the bullets when expanded', () => {
    const element = render(true);

    expect(element.querySelectorAll('textarea').length).toBe(3);
    expect(element.querySelector<HTMLInputElement>('input[name="company"]')?.value).toBe('Example Payments');
  });
});
