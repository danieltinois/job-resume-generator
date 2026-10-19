import type { CanDeactivateFn } from '@angular/router';
import type { ProfileEditor } from './profile-editor';

/** Leaving the profile editor first saves pending edits, or asks before dropping them. */
export const unsavedChangesGuard: CanDeactivateFn<ProfileEditor> = (editor) => editor.canLeave();
