import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';
import { confirmDialogButton, dialogOverlay } from './testing';

describe('ConfirmDialog', () => {
  const options = { title: 'Delete it?', text: 'This cannot be undone.', confirmLabel: 'Delete' };

  const overlay = dialogOverlay;

  async function opened(destructive = false) {
    const service = TestBed.inject(ConfirmDialog);
    const answer = service.confirm({ ...options, destructive });
    await confirmDialogButton('confirm');
    // Boxed: returning the promise itself would make `await opened()` wait for the answer.
    return { answer };
  }

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('shows the title, the text and the confirm label', async () => {
    const { answer } = await opened();

    expect(overlay().textContent).toContain('Delete it?');
    expect(overlay().textContent).toContain('This cannot be undone.');
    expect(overlay().querySelector('button[data-test="confirm"]')?.textContent).toContain('Delete');
    overlay().querySelector<HTMLButtonElement>('button[data-test="cancel"]')!.click();
    await answer;
  });

  it('resolves true on confirm', async () => {
    const { answer } = await opened();

    overlay().querySelector<HTMLButtonElement>('button[data-test="confirm"]')!.click();

    expect(await answer).toBe(true);
  });

  it('resolves false on cancel', async () => {
    const { answer } = await opened();

    overlay().querySelector<HTMLButtonElement>('button[data-test="cancel"]')!.click();

    expect(await answer).toBe(false);
  });

  it('resolves false on Escape', async () => {
    const { answer } = await opened();

    overlay()
      .querySelector('mat-dialog-container')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

    expect(await answer).toBe(false);
  });

  it('resolves false on a backdrop click', async () => {
    const { answer } = await opened();

    overlay().querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();

    expect(await answer).toBe(false);
  });

  it('styles the confirm button as dangerous when destructive', async () => {
    const { answer } = await opened(true);

    expect(overlay().querySelector('button[data-test="confirm"]')?.classList).toContain('danger');
    overlay().querySelector<HTMLButtonElement>('button[data-test="cancel"]')!.click();
    await answer;
  });

  it('keeps the normal style when not destructive', async () => {
    const { answer } = await opened(false);

    expect(overlay().querySelector('button[data-test="confirm"]')?.classList).not.toContain('danger');
    overlay().querySelector<HTMLButtonElement>('button[data-test="cancel"]')!.click();
    await answer;
  });
});
