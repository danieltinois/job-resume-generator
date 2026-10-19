import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import type { Profile } from '../core/api/types';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { ImportDialog } from './import-dialog';

describe('ImportDialog', () => {
  it('converts a legacy YAML and returns it only after confirmation', async () => {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [...apiTestProviders, { provide: MatDialogRef, useValue: { close } }],
    });
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ImportDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.choose(new File(['personal: {name: Alex}'], 'profile.yaml', { type: 'application/yaml' }));
    component.language.set('en');
    void component.convert();
    const request = backend.expectOne('/api/profile/import');
    const body = request.request.body as FormData;
    expect(body.get('language')).toBe('en');
    expect((body.get('file') as File).name).toBe('profile.yaml');
    request.flush(example);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('2');
    fixture.nativeElement.querySelector('button[data-test="replace"]').click();
    expect(close).toHaveBeenCalledWith(example as Profile);
  });
  it('names its file picker and language choice', () => {
    TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [...apiTestProviders, { provide: MatDialogRef, useValue: { close: vi.fn() } }],
    });
    const fixture = TestBed.createComponent(ImportDialog);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const file = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(file.labels?.[0]?.textContent).toContain('profile.yaml');
    const group = element.querySelector('mat-button-toggle-group')!;
    expect(document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent).toContain('language');
  });
});
