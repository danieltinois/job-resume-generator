import { Routes } from '@angular/router';

/** Children of the app shell, which guards them. */
export const dashboardRoutes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./dashboard').then((m) => m.Dashboard) },
  { path: 'jobs/new', loadComponent: () => import('./new-job').then((m) => m.NewJob) },
];
