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
  it('saves pending edits before leaving the page', async () => {
    const fixture = await render();
    fixture.componentInstance.form()!.controls.personal.controls.name.setValue('Leaving');

    const leaving = fixture.componentInstance.canLeave();

    const save = backend.expectOne((request) => request.method === 'PUT');
    expect(save.request.body.data.personal.name).toBe('Leaving');
    save.flush({ version: 4 });
    expect(await leaving).toBe(true);
  });

  it('asks before leaving edits that cannot be saved', async () => {
    const fixture = await render();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.componentInstance.form()!.controls.personal.controls.name.setValue('');

    expect(await fixture.componentInstance.canLeave()).toBe(false);

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('not saved'));
    backend.expectNone((request) => request.method === 'PUT');
    confirm.mockRestore();
  });

  it('leaves without asking when everything is saved', async () => {
    const fixture = await render();
    const confirm = vi.spyOn(window, 'confirm');

    expect(await fixture.componentInstance.canLeave()).toBe(true);

    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('warns before closing the tab with unsaved edits', async () => {
    const fixture = await render();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    fixture.componentInstance.form()!.controls.personal.controls.name.setValue('Typed');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);

    expect(dirty.defaultPrevented).toBe(true);
  });
});
