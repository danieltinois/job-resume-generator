import { TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { AchievementList } from './achievement-list';
import { type AchievementForm, newAchievement } from './profile-form';

describe('AchievementList', () => {
  function render(texts: string[]) {
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_LANGUAGE, useValue: 'en' }] });
    const fixture = TestBed.createComponent(AchievementList);
    const list = new FormArray<AchievementForm>(
      texts.map((text) => {
        const item = newAchievement();
        item.controls.text.controls.pt.setValue(text);
        return item;
      }),
    );
    fixture.componentRef.setInput('achievements', list);
    fixture.componentRef.setInput('mode', 'pt');
    fixture.componentRef.setInput('suggestions', []);
    fixture.detectChanges();
    return { fixture, list, element: fixture.nativeElement as HTMLElement };
  }

  it('adds the next bullet when Enter is pressed at the end of one', async () => {
    const { fixture, list, element } = render(['Built the API']);
    const textarea = element.querySelector('textarea')!;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(list.length).toBe(2);
    expect(list.at(1).controls.text.controls.pt.value).toBe('');
    expect(element.querySelectorAll('textarea').length).toBe(2);
  });

  it('keeps Enter in the middle of a bullet as text', () => {
    const { list, element } = render(['Built the API']);
    const textarea = element.querySelector('textarea')!;
    textarea.setSelectionRange(3, 3);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    expect(list.length).toBe(1);
  });

  it('reorders with the move buttons', () => {
    const { fixture, list, element } = render(['first', 'second']);

    element.querySelector<HTMLButtonElement>('button[data-test="move-down"]')!.click();
    fixture.detectChanges();

    expect(list.controls.map((item) => item.controls.text.controls.pt.value)).toEqual(['second', 'first']);
  });

  it('removes a bullet', () => {
    const { fixture, list, element } = render(['first', 'second']);

    element.querySelector<HTMLButtonElement>('button[data-test="remove"]')!.click();
    fixture.detectChanges();

    expect(list.controls.map((item) => item.controls.text.controls.pt.value)).toEqual(['second']);
  });
});
