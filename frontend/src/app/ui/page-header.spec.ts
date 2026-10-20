import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="Jobs" subtitle="Everything you pasted">
      <button actions type="button" data-test="action">New</button>
    </app-page-header>
  `,
})
class Host {}

describe('PageHeader', () => {
  it('renders the title, the subtitle and the projected actions', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Jobs');
    expect(element.textContent).toContain('Everything you pasted');
    expect(element.querySelector('.actions button[data-test="action"]')).not.toBeNull();
  });
});
