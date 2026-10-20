import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusPill } from './status-pill';

@Component({
  imports: [StatusPill],
  template: `<app-status-pill tone="warn">Draft</app-status-pill>`,
})
class Host {}

describe('StatusPill', () => {
  it('shows its text and marks its tone', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const pill: HTMLElement = fixture.nativeElement.querySelector('app-status-pill');

    expect(pill.textContent).toContain('Draft');
    expect(pill.classList).toContain('tone-warn');
  });

  it('is neutral by default', () => {
    const fixture = TestBed.createComponent(StatusPill);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('tone-neutral');
  });
});
