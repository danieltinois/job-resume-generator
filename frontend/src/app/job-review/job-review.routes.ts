import { Routes } from '@angular/router';

/** Children of the app shell, which guards them. */
export const jobReviewRoutes: Routes = [
  { path: 'jobs/:id/review', loadComponent: () => import('./job-review').then((m) => m.JobReview) },
];
