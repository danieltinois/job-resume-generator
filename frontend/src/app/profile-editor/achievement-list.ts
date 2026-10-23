import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import type { TechTerm } from '../core/api/types';
import { I18n } from '../core/i18n/i18n';
import { type EditLanguage, LocalizedField } from './localized-field';
import { type AchievementForm, newAchievement } from './profile-form';
import { SkillChips } from './skill-chips';

/** The bullets of one job: type, press Enter for the next, drag or use the buttons to reorder. */
@Component({
  selector: 'app-achievement-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, MatButtonModule, LocalizedField, SkillChips],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div cdkDropList (cdkDropListDropped)="drop($event)" class="list">
      @for (item of achievements().controls; track item; let i = $index, last = $last) {
        <div class="achievement" cdkDrag>
          <span class="handle" cdkDragHandle aria-hidden="true">⋮⋮</span>
          <div class="body">
            <app-localized-field
              [group]="item.controls.text"
              [mode]="mode()"
              [label]="i18n.t('profile.field.achievement')"
              [multiline]="true"
              (enterAtEnd)="addAfter(i)"
            />
            <app-skill-chips
              [control]="item.controls.skills"
              [label]="i18n.t('profile.field.skills')"
              [terms]="terms()"
              [extra]="suggestions()"
            />
          </div>
          <div class="actions">
            <button mat-icon-button type="button" data-test="move-up" [disabled]="i === 0"
              [attr.aria-label]="i18n.t('common.moveUp')" (click)="move(i, i - 1)">↑</button>
            <button mat-icon-button type="button" data-test="move-down" [disabled]="last"
              [attr.aria-label]="i18n.t('common.moveDown')" (click)="move(i, i + 1)">↓</button>
            <button mat-icon-button type="button" data-test="remove"
              [attr.aria-label]="i18n.t('common.remove')" (click)="remove(i)">✕</button>
          </div>
        </div>
      }
    </div>
    <p class="hint">{{ i18n.t('profile.enterHint') }}</p>
    <button mat-stroked-button type="button" (click)="addAfter(achievements().length - 1)">
      + {{ i18n.t('profile.add.achievement') }}
    </button>
  `,
  styles: `
    .achievement {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
    }
    .handle {
      cursor: grab;
      padding-top: 16px;
      user-select: none;
    }
    .body {
      flex: 1;
      min-width: 0;
    }
    .actions {
      display: flex;
      flex-direction: column;
    }
    .hint {
      margin: 12px 0;
      font-size: 13px;
      color: var(--app-muted);
    }
  `,
})
export class AchievementList {
  readonly achievements = input.required<FormArray<AchievementForm>>();
  readonly mode = input.required<EditLanguage>();
  readonly suggestions = input<string[]>([]);
  readonly terms = input<TechTerm[]>([]);

  protected readonly i18n = inject(I18n);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  addAfter(index: number): void {
    this.achievements().insert(index + 1, newAchievement());
    afterNextRender(() => this.host.nativeElement.querySelectorAll('textarea')[index + 1]?.focus(), {
      injector: this.injector,
    });
  }

  move(from: number, to: number): void {
    const list = this.achievements();
    if (to < 0 || to >= list.length) {
      return;
    }
    const item = list.at(from);
    list.removeAt(from, { emitEvent: false });
    list.insert(to, item);
  }

  remove(index: number): void {
    this.achievements().removeAt(index);
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    this.move(event.previousIndex, event.currentIndex);
  }
}
