import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small coloured pill for a status or a count. */
@Component({
  selector: 'app-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"tone-" + tone()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      line-height: 20px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    :host(.tone-neutral) {
      background: var(--app-subtle);
      color: var(--app-text);
      border-color: var(--app-border);
    }
    :host(.tone-accent) {
      background: var(--app-accent-soft);
      color: var(--app-on-accent-soft);
    }
    :host(.tone-warn) {
      background: var(--app-warn-soft);
      color: var(--app-on-warn-soft);
    }
    :host(.tone-danger) {
      background: var(--app-surface);
      color: var(--app-danger);
      border-color: var(--app-danger);
    }
  `,
})
export class StatusPill {
  readonly tone = input<'neutral' | 'accent' | 'warn' | 'danger'>('neutral');
}
