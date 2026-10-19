import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const dashboardRoutes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [authGuard], loadComponent: () => import('./dashboard').then((m) => m.Dashboard) },
  { path: 'jobs/new', canActivate: [authGuard], loadComponent: () => import('./new-job').then((m) => m.NewJob) },
];
