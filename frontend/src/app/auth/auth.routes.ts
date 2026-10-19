import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./register').then((m) => m.Register) },
  { path: 'verify-email', loadComponent: () => import('./verify-email').then((m) => m.VerifyEmail) },
  { path: 'forgot-password', loadComponent: () => import('./forgot-password').then((m) => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./reset-password').then((m) => m.ResetPassword) },
  { path: 'auth/callback', loadComponent: () => import('./google-callback').then((m) => m.GoogleCallback) },
];
