import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { profileRoutes } from './profile-editor/profile.routes';

export const routes: Routes = [...authRoutes, ...profileRoutes];
