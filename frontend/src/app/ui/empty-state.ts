import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Illustration, title, text and an optional projected action for a screen with nothing to show. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="art" viewBox="0 0 96 96" width="96" height="96" fill="none" aria-hidden="true">
      @switch (kind()) {
        @case ('jobs') {
          <rect class="soft" x="16" y="30" width="64" height="44" rx="8" />
          <path class="line" d="M36 30v-6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v6M16 50h64" />
          <rect class="accent" x="42" y="46" width="12" height="10" rx="3" />
        }
        @case ('profile') {
          <rect class="soft" x="20" y="14" width="56" height="68" rx="8" />
          <circle class="accent" cx="48" cy="38" r="9" />
          <path class="line" d="M32 66c2-9 8-13 16-13s14 4 16 13" />
        }
        @case ('search') {
          <circle class="soft" cx="42" cy="42" r="22" />
          <circle class="line" cx="42" cy="42" r="22" />
          <path class="accent-line" d="M58 58l18 18" />
        }
        @case ('error') {
          <path class="soft" d="M48 16 84 78H12z" />
          <path class="line" d="M48 16 84 78H12z" stroke-linejoin="round" />
          <path class="accent-line" d="M48 40v18M48 66v2" />
        }
      }
    </svg>
    <h2>{{ title() }}</h2>
    @if (text()) {
      <p>{{ text() }}</p>
    }
    <div class="action"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 16px;
      text-align: center;
    }
    .soft {
      fill: var(--app-accent-soft);
    }
    .line,
    .accent-line {
      stroke-width: 2.5;
      stroke-linecap: round;
    }
    .line {
      stroke: var(--app-border-strong);
    }
    .accent-line {
      stroke: var(--app-accent);
    }
    .accent {
      fill: var(--app-accent);
    }
    h2 {
      margin: 8px 0 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--app-text);
    }
    p {
      margin: 0;
      max-width: 40ch;
      color: var(--app-muted);
    }
    .action:not(:empty) {
      margin-top: 8px;
    }
  `,
})
export class EmptyState {
  readonly kind = input<'jobs' | 'profile' | 'search' | 'error'>('jobs');
  readonly title = input.required<string>();
  readonly text = input<string>();
}
