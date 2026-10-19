import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BROWSER_LANGUAGE } from '../core/i18n/i18n';
import { ConflictDialog } from './conflict-dialog';

describe('ConflictDialog', () => {
  function render() {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ConflictDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: BROWSER_LANGUAGE, useValue: 'en' },
      ],
    });
    const fixture = TestBed.createComponent(ConflictDialog);
    fixture.detectChanges();
    return { close, element: fixture.nativeElement as HTMLElement };
  }

  it('offers reloading the saved version', () => {
    const { close, element } = render();

    element.querySelector<HTMLButtonElement>('button[data-test="reload"]')!.click();

    expect(close).toHaveBeenCalledWith('reload');
  });

  it('offers keeping the local version', () => {
    const { close, element } = render();

    element.querySelector<HTMLButtonElement>('button[data-test="keep"]')!.click();

    expect(close).toHaveBeenCalledWith('keep');
  });
});
