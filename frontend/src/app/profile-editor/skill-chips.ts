import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import type { TechTerm } from '../core/api/types';
import { I18n } from '../core/i18n/i18n';

const MAX_OPTIONS = 8;

/** Lowercase, no accents, trimmed: how two spellings of a skill are compared. */
const normalize = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Skills as chips. Suggestions come from the known tech terms (matched by
 * name or alias, so "postg" offers PostgreSQL) and the user's own skills,
 * nudging everyone towards the names the matcher recognises.
 */
@Component({
  selector: 'app-skill-chips',
  imports: [MatChipsModule, MatAutocompleteModule, MatFormFieldModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width">
      <mat-label>{{ label() }}</mat-label>
      <mat-chip-grid #grid [attr.aria-label]="label()">
        @for (skill of chosen(); track skill) {
          <mat-chip-row (removed)="remove(skill)">
            {{ skill }}
            <button matChipRemove type="button" [attr.aria-label]="i18n.t('common.remove') + ' ' + skill">✕</button>
          </mat-chip-row>
        }
      </mat-chip-grid>
      <!-- Outside the grid on purpose: a role=grid may only own rows, and the combobox input is not one. -->
      <input
        #entry
        class="entry"
        [matChipInputFor]="grid"
        [matAutocomplete]="auto"
        (input)="query.set(entry.value)"
        (matChipInputTokenEnd)="add($event.value); entry.value = ''"
      />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="add($event.option.value); entry.value = ''">
        @for (option of options(); track option) {
          <mat-option [value]="option">{{ option }}</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: `
    mat-form-field {
      margin-bottom: 16px;
    }
    /* The chips wrap in their own block and the input sits under them, full width. */
    .entry {
      width: 100%;
    }
  `,
})
export class SkillChips {
  readonly control = input.required<FormControl<string[]>>();
  readonly label = input.required<string>();
  /** Known technologies, from /api/tech-terms. */
  readonly terms = input<TechTerm[]>([]);
  /** The user's other skills. */
  readonly extra = input<string[]>([]);

  protected readonly i18n = inject(I18n);
  readonly query = signal('');
  protected readonly chosen = signal<string[]>([]);

  readonly options = computed(() => {
    const taken = new Set(this.chosen().map(normalize));
    const query = normalize(this.query());
    const candidates = new Map<string, string[]>();
    for (const term of this.terms()) {
      candidates.set(term.canonical ?? '', term.aliases ?? []);
    }
    for (const skill of this.extra()) {
      if (![...candidates.keys()].some((name) => normalize(name) === normalize(skill))) {
        candidates.set(skill, []);
      }
    }
    return [...candidates.entries()]
      .filter(([name]) => name && !taken.has(normalize(name)))
      .filter(([name, aliases]) =>
        !query || [name, ...aliases].some((form) => normalize(form).startsWith(query)) || normalize(name).includes(query),
      )
      .map(([name]) => name)
      .slice(0, MAX_OPTIONS);
  });

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      this.chosen.set(control.value);
      const subscription = control.valueChanges.subscribe((value) => this.chosen.set(value));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  add(value: string): void {
    const skill = value.trim();
    const control = this.control();
    if (!skill || control.value.some((existing) => normalize(existing) === normalize(skill))) {
      this.query.set('');
      return;
    }
    control.setValue([...control.value, skill]);
    control.markAsDirty();
    this.query.set('');
  }

  remove(skill: string): void {
    const control = this.control();
    control.setValue(control.value.filter((existing) => existing !== skill));
    control.markAsDirty();
  }
}
