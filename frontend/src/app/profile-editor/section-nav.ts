import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { ProfileSection } from './profile-form';

export interface SectionStatus {
  key: ProfileSection;
  label: string;
  missingEnglish: number;
  /** Touched and invalid: shown as a red dot and in text. */
  invalid: boolean;
}

/** The editor's side menu: jumps to a section and shows what still needs attention there. */
@Component({
  selector: 'app-section-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="i18n.t('profile.title')">
      @for (section of sections(); track section.key) {
        <a [href]="'#' + section.key" [attr.data-section]="section.key" (click)="jump($event, section.key)">
          <span class="label">{{ section.label }}</span>
          @if (section.invalid) {
            <span class="dot" aria-hidden="true"></span>
            <span class="visually-hidden">{{ i18n.t('profile.invalid') }}</span>
          }
          @if (section.missingEnglish > 0) {
            <span class="badge" aria-hidden="true">{{ section.missingEnglish }}</span>
            <span class="visually-hidden">{{ i18n.t('profile.missingEn', { count: section.missingEnglish }) }}</span>
          }
        </a>
      }
    </nav>
  `,
  styles: `
    /* A strip that scrolls sideways on narrow screens; a sticky column from 1024 px. The padding keeps focus rings inside the scroll area. */
    nav {
      display: flex;
      gap: 4px;
      margin: -4px -4px 12px;
      padding: 4px;
      overflow-x: auto;
    }
    a {
      position: relative;
      display: flex;
      flex: none;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      min-height: 40px;
      padding: 0 12px;
      border-radius: 8px;
      color: var(--app-text);
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 150ms ease;
    }
    a:hover {
      background: var(--app-subtle);
    }
    .label {
      flex: 1;
    }
    /* Invalid sections get a red dot; the visually hidden text says the same for everyone else. */
    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--app-danger);
    }
    /* Amber count of text still missing in English. */
    .badge {
      min-width: 20px;
      padding: 0 6px;
      border-radius: 10px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 20px;
      text-align: center;
      background: var(--app-warn-soft);
      color: var(--app-on-warn-soft);
    }
    @media (min-width: 1024px) {
      nav {
        position: sticky;
        top: 24px;
        flex-direction: column;
        margin: 0;
        padding: 0;
        overflow-x: visible;
      }
    }
  `,
})
export class SectionNav {
  readonly sections = input.required<SectionStatus[]>();
  protected readonly i18n = inject(I18n);

  protected jump(event: Event, key: string): void {
    event.preventDefault();
    document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
