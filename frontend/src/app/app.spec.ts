import { TestBed } from '@angular/core/testing';
import { apiTestProviders } from './auth/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: apiTestProviders }).compileComponents();
  });

  it('renders the routed layout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.querySelector('mat-toolbar')).toBeNull();
  });
});
