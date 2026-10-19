import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { watchCsp } from './csp';
import { latestLink } from './mailpit';

const fixture = (path: string) => join(__dirname, '..', '..', path);

test('registers, imports a profile, tailors a resume and downloads the PDF', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'correct horse battery staple';
  const violations = watchCsp(page);

  await test.step('register and confirm the email', async () => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ada Example');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();

    const link = await latestLink(email);
    expect(link).toContain('/verify-email?token=');
    await page.goto(link);
    await expect(page.getByText('Email confirmed')).toBeVisible();
  });

  await test.step('sign in', async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My jobs' })).toBeVisible();
    await expect(page).toHaveTitle('Resume Tailor');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  await test.step('import the example profile', async () => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Import profile.yaml' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles(fixture('profile/profile.example.yaml'));
    await dialog.getByRole('radio', { name: 'EN' }).click();
    await dialog.getByRole('button', { name: 'Convert' }).click();
    await dialog.getByRole('button', { name: 'Replace my profile' }).click();
    await expect(page.locator('[data-test=save-status]')).toHaveText('Saved');
  });

  await test.step('analyze a job', async () => {
    await page.getByRole('link', { name: 'Jobs' }).first().click();
    await page.getByRole('link', { name: 'New job' }).click();
    await page.getByLabel('Job description').fill(await readFile(fixture('jobs/example.md'), 'utf8'));
    await page.getByRole('button', { name: 'Analyze job' }).click();

    await expect(page).toHaveURL(/\/jobs\/[^/]+\/review$/);
    await expect(page.locator('[data-test=matched]')).toContainText('Kafka');
    await expect(page.locator('[data-test=missing]')).toContainText('CI/CD');
    await expect(page.locator('iframe[title="Resume preview"]')).toHaveAttribute('src', /^blob:/);
    await expect(page.frameLocator('iframe[title="Resume preview"]').locator('embed[type="application/pdf"]')).toHaveCount(1);
  });

  await test.step('save the resume and download the PDF', async () => {
    await page.locator('[data-test=save]').click();
    await expect(page.getByText('Resume saved.')).toBeVisible();

    const downloading = page.waitForEvent('download');
    await page.locator('[data-test=download]').click();
    const download = await downloading;
    const pdf = await readFile(await download.path());
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  await test.step('sign out', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    // Signed out once the server has ended the session and the toolbar shows it.
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeHidden();
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  expect(violations).toEqual([]);
});
