import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Shimmering placeholder bars. Decorative: the page keeps its own `role="status"` text. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (bar of bars(); track bar) {
      <span class="bar" [class]="shape()" [style.height]="height()"></span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bar {
      display: block;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--app-subtle) 25%, var(--app-border) 50%, var(--app-subtle) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .bar.block {
      border-radius: 12px;
    }
    .bar.circle {
      width: var(--skeleton-size, 40px);
      border-radius: 999px;
    }
    @keyframes shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
        background: var(--app-subtle);
      }
    }
  `,
})
export class Skeleton {
  readonly lines = input(1);
  readonly height = input('14px');
  readonly shape = input<'text' | 'block' | 'circle'>('text');

  protected readonly bars = computed(() => Array.from({ length: Math.max(1, this.lines()) }, (_, index) => index));
}
