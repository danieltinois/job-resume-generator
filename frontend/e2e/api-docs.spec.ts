import { expect, test } from '@playwright/test';
import { watchCsp } from './csp';

test('serves Swagger UI through the proxy within the security policy', async ({ page }) => {
  const violations = watchCsp(page);

  await page.goto('/swagger-ui.html');

  await expect(page.getByRole('heading', { name: /Resume Tailor API/ })).toBeVisible();
  await expect(page.getByText('/api/auth/login').first()).toBeVisible();
  expect(violations).toEqual([]);
});
