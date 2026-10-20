import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { expect, vi } from 'vitest';

/** The element every `MatDialog` renders into. Dialogs live outside the component fixture. */
export function dialogOverlay(): HTMLElement {
  return TestBed.inject(OverlayContainer).getContainerElement();
}

/** Waits until a confirm dialog is rendered and bound, then returns one of its buttons. */
export async function confirmDialogButton(name: 'confirm' | 'cancel'): Promise<HTMLButtonElement> {
  const selector = `button[data-test="${name}"]`;
  await vi.waitFor(() => {
    TestBed.tick();
    expect(dialogOverlay().querySelector(selector)).not.toBeNull();
  });
  return dialogOverlay().querySelector<HTMLButtonElement>(selector)!;
}

/** Waits until no dialog is open any more. */
export async function dialogClosed(): Promise<void> {
  await vi.waitFor(() => expect(dialogOverlay().querySelector('mat-dialog-container')).toBeNull());
}
