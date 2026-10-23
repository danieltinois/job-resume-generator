import { OverlayContainer } from '@angular/cdk/overlay';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { of } from 'rxjs';
import type { Profile } from '../core/api/types';
import { AuthStore } from '../core/auth/auth-store';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { Kbd } from '../ui/kbd';
import { dialogOverlay, confirmDialogButton } from '../ui/testing';
import { ProfileEditor } from './profile-editor';

describe('ProfileEditor', () => {
  let backend: HttpTestingController;

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

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

  async function openActionsMenu(fixture: Awaited<ReturnType<typeof render>>): Promise<MatMenuHarness> {
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.open();
    return menu;
  }

  it('shows the save status as a pill with the save shortcut', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    const status = element.querySelector('[data-test="save-status"]')!;

    expect(status.tagName).toBe('APP-STATUS-PILL');
    expect(status.getAttribute('role')).toBe('status');
    const hint = status.nextElementSibling!;
    expect(hint.tagName).toBe('APP-KBD');
    expect(fixture.debugElement.query(By.directive(Kbd)).componentInstance.keys()).toBe('Mod+S');
  });

  it('moves import and export into the actions menu', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('button[data-test="export"]')).toBeNull();

    const menu = await openActionsMenu(fixture);

    const items = await menu.getItems();
    expect(await Promise.all(items.map((item) => item.getText()))).toEqual([
      expect.stringContaining('Import profile.yaml'),
      expect.stringContaining('Export JSON'),
    ]);
    expect(dialogOverlay().querySelector('button[data-test="export"]')).not.toBeNull();
  });

  it('marks invalid sections in text, not only colour', async () => {
    const fixture = await render();
    const personal = fixture.componentInstance.form()!.controls.personal;
    personal.markAllAsTouched();
    personal.controls.name.setValue('');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('[data-section="personal"]')!;

    expect(link.querySelector('.visually-hidden')?.textContent).toContain('Has errors');
    expect(link.querySelector('.dot')?.getAttribute('aria-hidden')).toBe('true');
    const valid = (fixture.nativeElement as HTMLElement).querySelector('[data-section="summary"]')!;
    expect(valid.querySelector('.visually-hidden')).toBeNull();
  });

  it('shows skeletons while the profile loads', () => {
    TestBed.configureTestingModule({ imports: [ProfileEditor], providers: apiTestProviders });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).acceptToken('token');
    const fixture = TestBed.createComponent(ProfileEditor);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-skeleton')).not.toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading');
    expect(element.querySelector('form')).toBeNull();
    backend.expectOne('/api/profile');
    backend.expectOne('/api/tech-terms');
  });

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

    await openActionsMenu(fixture);
    dialogOverlay().querySelector<HTMLButtonElement>('button[data-test="export"]')!.click();

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
    fixture.componentInstance.form()!.controls.personal.controls.name.setValue('');

    const leaving = fixture.componentInstance.canLeave();

    const cancel = await confirmDialogButton('cancel');
    expect(dialogOverlay().textContent).toContain('not saved');
    cancel.click();
    expect(await leaving).toBe(false);
    backend.expectNone((request) => request.method === 'PUT');
  });

  it('leaves after the user confirms', async () => {
    const fixture = await render();
    fixture.componentInstance.form()!.controls.personal.controls.name.setValue('');

    const leaving = fixture.componentInstance.canLeave();

    (await confirmDialogButton('confirm')).click();
    expect(await leaving).toBe(true);
  });

  it('leaves without asking when everything is saved', async () => {
    const fixture = await render();

    expect(await fixture.componentInstance.canLeave()).toBe(true);

    expect(dialogOverlay().querySelector('mat-dialog-container')).toBeNull();
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

  it('lets a save in flight finish before importing over it, so the import does not conflict', async () => {
    const fixture = await render();
    const imported = { ...(example as Profile), personal: { ...(example as Profile).personal, name: 'Imported' } };
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of(imported) } as never);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));
    const inFlight = backend.expectOne((request) => request.method === 'PUT');

    const importing = (fixture.componentInstance as unknown as { openImport(): Promise<void> }).openImport();
    await fixture.whenStable();
    backend.expectNone((request) => request.method === 'PUT');
    inFlight.flush({ version: 4 });

    await vi.waitFor(() => {
      const save = backend.expectOne((request) => request.method === 'PUT');
      expect(save.request.body.version).toBe(4);
      expect(save.request.body.data.personal.name).toBe('Imported');
      save.flush({ version: 5 });
    });
    await importing;
  });
  it('says what the missing-English badge counts, not only in a tooltip', async () => {
    const profile = structuredClone(example) as Profile;
    profile.summary!.en = null;

    const fixture = await render(profile);

    const link = (fixture.nativeElement as HTMLElement).querySelector('[data-section="summary"]')!;
    expect(link.textContent).toContain('1 missing English');
  });
});
