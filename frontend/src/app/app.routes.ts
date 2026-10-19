import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { dashboardRoutes } from './dashboard/dashboard.routes';
import { jobReviewRoutes } from './job-review/job-review.routes';
import { profileRoutes } from './profile-editor/profile.routes';

export const routes: Routes = [...authRoutes, ...profileRoutes, ...jobReviewRoutes, ...dashboardRoutes, { path: '**', redirectTo: '' }];
