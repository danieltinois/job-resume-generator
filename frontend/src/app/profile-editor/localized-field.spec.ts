import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { LocalizedField } from './localized-field';
import type { LocalizedForm } from './profile-form';

describe('LocalizedField', () => {
  function render(mode: 'pt' | 'en') {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'en' }] });
    const fixture = TestBed.createComponent(LocalizedField);
    const group: LocalizedForm = new FormGroup({
      pt: new FormControl('Engenheiro Backend', { nonNullable: true }),
      en: new FormControl('', { nonNullable: true }),
    });
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('label', 'Title');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('edits Portuguese without a reference in PT mode', () => {
    const element = render('pt');

    expect(element.querySelector('input')!.value).toBe('Engenheiro Backend');
    expect(element.querySelector('.reference')).toBeNull();
  });

  it('shows the Portuguese text as a reference in EN mode', () => {
    const element = render('en');

    expect(element.querySelector('input')!.value).toBe('');
    expect(element.querySelector('.reference')?.textContent).toContain('Engenheiro Backend');
  });
});
