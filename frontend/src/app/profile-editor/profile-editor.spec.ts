import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Profile } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { ProfileEditor } from './profile-editor';

describe('ProfileEditor', () => {
  let backend: HttpTestingController;

  async function render(profile: Profile = example as Profile) {
    TestBed.configureTestingModule({ imports: [ProfileEditor], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(ProfileEditor);
    fixture.detectChanges();
    backend.expectOne('/api/profile').flush({ version: 3, data: profile });
    backend.expectOne('/api/tech-terms').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('counts missing English per section in the navigation', async () => {
    const profile = structuredClone(example) as Profile;
    profile.summary!.en = null;
    profile.experiences![0].achievements![0].text!.en = null;
    profile.experiences![0].achievements![1].text!.en = null;

    const fixture = await render(profile);

    const badge = (section: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`[data-section="${section}"] .badge`)?.textContent?.trim();
    expect(badge('summary')).toBe('1');
    expect(badge('experiences')).toBe('2');
    expect(badge('projects')).toBeUndefined();
  });

  it('saves immediately on Ctrl+S', async () => {
    await render();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));

    const save = backend.expectOne((request) => request.method === 'PUT' && request.url === '/api/profile');
    expect(save.request.body.version).toBe(3);
  });

  it('shows the save status', async () => {
    const fixture = await render();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));
    backend.expectOne((request) => request.method === 'PUT').flush({ version: 4 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-test="save-status"]').textContent).toContain('Saved');
  });

  it('downloads the export', async () => {
    const fixture = await render();
    URL.createObjectURL = vi.fn(() => 'blob:profile');
    URL.revokeObjectURL = vi.fn();

    fixture.nativeElement.querySelector('button[data-test="export"]').click();

    backend.expectOne('/api/profile/export').flush(new Blob(['{}']));
    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });
});
