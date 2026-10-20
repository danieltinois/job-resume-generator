import { DestroyRef } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';
import { PLATFORM_IS_APPLE } from '../../ui/kbd';
import { dialogOverlay } from '../../ui/testing';
import { Shortcuts } from './shortcuts';
import { ShortcutsDialog } from './shortcuts-dialog';

describe('ShortcutsDialog', () => {
  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('lists the active shortcuts and the global help key', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_IS_APPLE, useValue: false }] });
    const handler = () => undefined;
    const shortcuts = TestBed.inject(Shortcuts);
    shortcuts.register({ key: 's', mod: true, description: 'shortcuts.save', handler }, TestBed.inject(DestroyRef));
    shortcuts.register({ key: 'n', description: 'shortcuts.help', handler }, TestBed.inject(DestroyRef));

    TestBed.inject(MatDialog).open(ShortcutsDialog);

    await vi.waitFor(() => {
      TestBed.tick();
      const keys = [...dialogOverlay().querySelectorAll('kbd')].map((kbd) => kbd.textContent?.trim());
      expect(keys).toEqual(['Ctrl+S', 'N', '?']);
    });
  });

  it('does not list the help key twice when it is registered', async () => {
    const handler = () => undefined;
    TestBed.inject(Shortcuts).register(
      { key: '?', description: 'shortcuts.help', handler },
      TestBed.inject(DestroyRef),
    );

    TestBed.inject(MatDialog).open(ShortcutsDialog);

    await vi.waitFor(() => {
      TestBed.tick();
      expect(dialogOverlay().querySelectorAll('kbd')).toHaveLength(1);
    });
  });
});
