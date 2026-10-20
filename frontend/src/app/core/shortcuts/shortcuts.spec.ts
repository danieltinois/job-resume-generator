import { type Mock, vi } from 'vitest';
import { DestroyRef, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { confirmDialogButton } from '../../ui/testing';
import { Shortcuts } from './shortcuts';

describe('Shortcuts', () => {
  let service: Shortcuts;
  let owner: DestroyRef;
  let handler: Mock<() => void>;
  let attached: HTMLElement[];

  beforeEach(() => {
    service = TestBed.inject(Shortcuts);
    owner = TestBed.inject(DestroyRef);
    handler = vi.fn<() => void>();
    attached = [];
  });

  afterEach(() => {
    attached.forEach((element) => element.remove());
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  function press(init: KeyboardEventInit, target: EventTarget = document): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  }

  function attach<T extends HTMLElement>(element: T): T {
    document.body.appendChild(element);
    attached.push(element);
    return element;
  }

  it('runs a registered shortcut', () => {
    service.register({ key: 'n', description: 'shortcuts.help', handler }, owner);

    press({ key: 'N' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores plain keys while typing in an input, a textarea and a contenteditable', () => {
    service.register({ key: 'n', description: 'shortcuts.help', handler }, owner);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const targets = [document.createElement('input'), document.createElement('textarea'), editable];

    for (const target of targets) {
      press({ key: 'n' }, attach(target));
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('still runs mod shortcuts while typing', () => {
    service.register({ key: 's', mod: true, description: 'shortcuts.save', handler }, owner);

    press({ key: 's', ctrlKey: true }, attach(document.createElement('input')));
    press({ key: 's', metaKey: true }, attach(document.createElement('textarea')));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignores plain keys while a dialog is open', async () => {
    service.register({ key: 'n', description: 'shortcuts.help', handler }, owner);
    void TestBed.inject(ConfirmDialog).confirm({ title: 'Sure?', confirmLabel: 'Yes' });
    await confirmDialogButton('cancel');

    press({ key: 'n' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('forgets a shortcut when its owner is destroyed', () => {
    const child = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    service.register({ key: 'n', description: 'shortcuts.help', handler }, child.get(DestroyRef));
    expect(service.active()).toHaveLength(1);

    child.destroy();

    expect(service.active()).toHaveLength(0);
    press({ key: 'n' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('prevents the browser default on a match', () => {
    service.register({ key: 's', mod: true, description: 'shortcuts.save', handler }, owner);

    expect(press({ key: 's', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: 'x', ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('keeps plain and mod shortcuts apart', () => {
    service.register({ key: 's', description: 'shortcuts.help', handler }, owner);

    press({ key: 's', ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores keydown events without a key, as browser autofill dispatches them', () => {
    service.register({ key: 'n', description: 'shortcuts.help', handler }, owner);
    // A throwing listener does not make dispatchEvent throw: it is reported on window.
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      errors.push(event.error);
    };
    window.addEventListener('error', onError);

    document.dispatchEvent(new Event('keydown', { bubbles: true }));

    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
    expect(handler).not.toHaveBeenCalled();
  });
});
