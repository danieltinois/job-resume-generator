import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { latestLink } from './mailpit';

/** Path of a repository fixture (profile/, jobs/) from the frontend e2e folder. */
export const fixture = (path: string) => join(__dirname, '..', '..', path);

/**
 * Registers a fresh user through Mailpit, signs in, imports `profile/profile.example.yaml` (EN)
 * and creates a job from `jobs/example.md`. Resolves with the URL of that job's review screen.
 */
export async function signInWithProfile(page: Page): Promise<{ reviewUrl: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'correct horse battery staple';

  await page.goto('/register');
  await page.getByLabel('Name').fill('Ada Example');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await page.goto(await latestLink(email));
  await expect(page.getByText('Email confirmed')).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My jobs' })).toBeVisible();

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Import profile.yaml' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type=file]').setInputFiles(fixture('profile/profile.example.yaml'));
  await dialog.getByRole('radio', { name: 'EN' }).click();
  await dialog.getByRole('button', { name: 'Convert' }).click();
  await dialog.getByRole('button', { name: 'Replace my profile' }).click();
  await expect(page.locator('[data-test=save-status]')).toHaveText('Saved');

  await page.getByRole('link', { name: 'Jobs' }).first().click();
  await page.getByRole('link', { name: 'New job' }).first().click();
  await page.getByLabel('Job description').fill(await readFile(fixture('jobs/example.md'), 'utf8'));
  await page.getByRole('button', { name: 'Analyze job' }).click();
  await expect(page).toHaveURL(/\/jobs\/[^/]+\/review$/);
  await expect(page.locator('[data-test=matched]')).toContainText('Kafka');
  await expect(page.locator('iframe[title="Resume preview"]')).toHaveAttribute('src', /^blob:/);

  return { reviewUrl: new URL(page.url()).pathname };
}
