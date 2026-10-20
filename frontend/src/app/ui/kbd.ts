import { ChangeDetectionStrategy, Component, InjectionToken, computed, inject, input } from '@angular/core';

/** Whether the keyboard hints should use Apple symbols. Injectable so tests can pick a platform. */
export const PLATFORM_IS_APPLE = new InjectionToken<boolean>('PLATFORM_IS_APPLE', {
  providedIn: 'root',
  factory: () => {
    const nav = globalThis.navigator as (Navigator & { userAgentData?: { platform?: string } }) | undefined;
    const platform = nav?.userAgentData?.platform || nav?.platform || '';
    return /Mac|iPhone|iPad/.test(platform);
  },
});

const APPLE_SYMBOLS: Record<string, string> = { Mod: '⌘', Enter: '↵', Shift: '⇧', Alt: '⌥' };
const OTHER_NAMES: Record<string, string> = { Mod: 'Ctrl' };

/** A keyboard shortcut hint: `Mod+S` reads `⌘S` on Apple platforms and `Ctrl+S` elsewhere. */
@Component({
  selector: 'app-kbd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<kbd>{{ label() }}</kbd>`,
  styles: `
    kbd {
      display: inline-block;
      min-width: 20px;
      padding: 1px 6px;
      border: 1px solid var(--app-border);
      border-radius: 6px;
      background: var(--app-subtle);
      color: var(--app-muted);
      font: inherit;
      font-size: 12px;
      line-height: 1.5;
      text-align: center;
    }
  `,
})
export class Kbd {
  readonly keys = input.required<string>();

  private readonly apple = inject(PLATFORM_IS_APPLE);

  protected readonly label = computed(() => {
    const parts = this.keys().split('+');
    return this.apple
      ? parts.map((part) => APPLE_SYMBOLS[part] ?? part).join('')
      : parts.map((part) => OTHER_NAMES[part] ?? part).join('+');
  });
}
