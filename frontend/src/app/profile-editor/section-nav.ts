import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { ProfileSection } from './profile-form';

export interface SectionStatus {
  key: ProfileSection;
  label: string;
  missingEnglish: number;
  invalid: boolean;
}

/** The editor's side menu: jumps to a section and shows what still needs attention there. */
@Component({
  selector: 'app-section-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="i18n.t('profile.title')">
      @for (section of sections(); track section.key) {
        <a [href]="'#' + section.key" [attr.data-section]="section.key" [class.invalid]="section.invalid"
          (click)="jump($event, section.key)">
          <span>{{ section.label }}</span>
          @if (section.missingEnglish > 0) {
            <span class="badge" aria-hidden="true">{{ section.missingEnglish }}</span>
            <span class="visually-hidden">{{ i18n.t('profile.missingEn', { count: section.missingEnglish }) }}</span>
          }
        </a>
      }
    </nav>
  `,
  styles: `
    nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: sticky;
      top: 16px;
    }
    a {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      color: inherit;
      text-decoration: none;
    }
    a:hover,
    a:focus-visible {
      background: var(--mat-sys-surface-container-high);
    }
    a.invalid {
      color: var(--mat-sys-error);
    }
    .badge {
      min-width: 20px;
      padding: 0 6px;
      border-radius: 10px;
      text-align: center;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
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
