import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state kind="jobs" title="No jobs yet" text="Paste the first one.">
      <button type="button" data-test="action">New job</button>
    </app-empty-state>
  `,
})
class Host {}

describe('EmptyState', () => {
  it('renders the title, the text and the projected action', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h2')?.textContent).toContain('No jobs yet');
    expect(element.textContent).toContain('Paste the first one.');
    expect(element.querySelector('button[data-test="action"]')).not.toBeNull();
  });

  it('hides its illustration from assistive technology', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('draws an illustration for every kind', () => {
    for (const kind of ['jobs', 'profile', 'search', 'error'] as const) {
      const fixture = TestBed.createComponent(EmptyState);
      fixture.componentRef.setInput('kind', kind);
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
    }
  });
});
