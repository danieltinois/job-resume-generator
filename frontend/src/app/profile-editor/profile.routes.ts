import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './unsaved-changes.guard';

/** Children of the app shell, which guards them. */
export const profileRoutes: Routes = [
  {
    path: 'profile',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./profile-editor').then((m) => m.ProfileEditor),
  },
];
