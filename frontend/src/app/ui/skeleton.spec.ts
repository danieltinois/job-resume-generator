import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders one bar per line and hides itself from assistive technology', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('lines', 3);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('.bar').length).toBe(3);
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a single bar by default', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.bar').length).toBe(1);
  });

  it('applies the height and the shape', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('height', '40px');
    fixture.componentRef.setInput('shape', 'circle');
    fixture.detectChanges();
    const bar: HTMLElement = fixture.nativeElement.querySelector('.bar');

    expect(bar.style.height).toBe('40px');
    expect(bar.classList).toContain('circle');
  });
});
