import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const profileRoutes: Routes = [
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./profile-editor').then((m) => m.ProfileEditor),
  },
];
