import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { authGuard } from './core/auth/auth.guard';
import { dashboardRoutes } from './dashboard/dashboard.routes';
import { jobReviewRoutes } from './job-review/job-review.routes';
import { profileRoutes } from './profile-editor/profile.routes';

/**
 * Two layouts share the empty path. The shell comes first: an empty-path parent matches an empty URL even
 * when none of its children does, so the sign-in layout would otherwise take '/'. The shell's guard covers both
 * entering the shell and every move between its pages.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [...dashboardRoutes, ...jobReviewRoutes, ...profileRoutes],
  },
  {
    path: '',
    loadComponent: () => import('./auth/auth-layout').then((m) => m.AuthLayout),
    children: authRoutes,
  },
  { path: '**', redirectTo: '' },
];
