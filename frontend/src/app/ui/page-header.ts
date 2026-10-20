import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title with an optional subtitle and a slot for the page's actions. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <h1>{{ title() }}</h1>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content select="[actions]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--app-text);
    }
    .subtitle {
      margin: 4px 0 0;
      color: var(--app-muted);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
