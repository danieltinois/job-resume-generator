import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';
import { unsavedChangesGuard } from './unsaved-changes.guard';

export const profileRoutes: Routes = [
  {
    path: 'profile',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./profile-editor').then((m) => m.ProfileEditor),
  },
];
