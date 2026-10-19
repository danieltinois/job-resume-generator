import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const jobReviewRoutes: Routes = [
  {
    path: 'jobs/:id/review',
    canActivate: [authGuard],
    loadComponent: () => import('./job-review').then((m) => m.JobReview),
  },
];
