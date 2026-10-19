import { signal } from '@angular/core';
import type { Selection } from '../core/api/types';

/** A selection with every field present: what the review screen edits. */
export interface FullSelection {
  experienceOrder: string[];
  achievements: Record<string, string[]>;
  projects: string[];
  skillOrder: Record<string, string[]>;
}

const EMPTY: FullSelection = { experienceOrder: [], achievements: {}, projects: [], skillOrder: {} };

function complete(selection: Selection | null | undefined): FullSelection {
  return {
    experienceOrder: [...(selection?.experienceOrder ?? [])],
    achievements: Object.fromEntries(
      Object.entries(selection?.achievements ?? {}).map(([id, list]) => [id, [...(list ?? [])]]),
    ),
    projects: [...(selection?.projects ?? [])],
    skillOrder: Object.fromEntries(
      Object.entries(selection?.skillOrder ?? {}).map(([id, list]) => [id, [...(list ?? [])]]),
    ),
  };
}

function moved<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * What goes into the resume, as the user adjusts the suggestion. Every
 * change produces a new object, so signals and the preview see it.
 * A hidden experience has no entry in {@code achievements}: the backend
 * rejects bullets of an experience that is not shown.
 */
export class SelectionState {
  private suggestion: FullSelection = EMPTY;
  readonly selection = signal<FullSelection>(EMPTY);

  reset(suggestion: Selection | null | undefined): void {
    this.suggestion = complete(suggestion);
    this.selection.set(complete(this.suggestion));
  }

  restore(): void {
    this.selection.set(complete(this.suggestion));
  }

  isShown(experienceId: string): boolean {
    return this.selection().experienceOrder.includes(experienceId);
  }

  toggleExperience(experienceId: string): void {
    this.update((current) => {
      if (current.experienceOrder.includes(experienceId)) {
        const achievements = { ...current.achievements };
        delete achievements[experienceId];
        return {
          ...current,
          experienceOrder: current.experienceOrder.filter((id) => id !== experienceId),
          achievements,
        };
      }
      return {
        ...current,
        experienceOrder: [...current.experienceOrder, experienceId],
        achievements: { ...current.achievements, [experienceId]: [] },
      };
    });
  }

  moveExperience(from: number, to: number): void {
    this.update((current) => ({ ...current, experienceOrder: moved(current.experienceOrder, from, to) }));
  }

  /** Ticks or unticks a bullet; ticking one of a hidden experience shows that experience. */
  toggleAchievement(experienceId: string, achievementId: string): void {
    if (!this.isShown(experienceId)) {
      this.toggleExperience(experienceId);
    }
    this.update((current) => {
      const list = current.achievements[experienceId] ?? [];
      const next = list.includes(achievementId)
        ? list.filter((id) => id !== achievementId)
        : [...list, achievementId];
      return { ...current, achievements: { ...current.achievements, [experienceId]: next } };
    });
  }

  moveAchievement(experienceId: string, from: number, to: number): void {
    this.update((current) => ({
      ...current,
      achievements: {
        ...current.achievements,
        [experienceId]: moved(current.achievements[experienceId] ?? [], from, to),
      },
    }));
  }

  toggleProject(projectId: string): void {
    this.update((current) => ({
      ...current,
      projects: current.projects.includes(projectId)
        ? current.projects.filter((id) => id !== projectId)
        : [...current.projects, projectId],
    }));
  }

  moveSkill(categoryId: string, from: number, to: number): void {
    this.update((current) => ({
      ...current,
      skillOrder: { ...current.skillOrder, [categoryId]: moved(current.skillOrder[categoryId] ?? [], from, to) },
    }));
  }

  private update(change: (current: FullSelection) => FullSelection): void {
    this.selection.set(change(this.selection()));
  }
}
