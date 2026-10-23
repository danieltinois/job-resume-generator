import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { watchCsp } from './csp';
import { signInWithProfile } from './session';

const schemes = ['light', 'dark'] as const;

/** Fails on any serious or critical WCAG 2.x A/AA violation on the page as currently shown. */
async function expectAccessible(page: Page, screen: string, scheme: string) {
  // Switching the scheme starts 150 ms colour transitions; axe must read the settled colours, not a mid-fade frame.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => `${node.target.join(' ')} :: ${node.failureSummary ?? ''}`),
    }));
  // Soft, so one run lists the violations of every screen and scheme at once.
  expect.soft(blocking, `${screen} (${scheme})`).toEqual([]);
}

test('has no serious accessibility violations in the light and dark schemes', async ({ page }) => {
  const violations = watchCsp(page);

  await test.step('sign-in page', async () => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    for (const scheme of schemes) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectAccessible(page, 'sign-in', scheme);
    }
  });

  const { reviewUrl } = await signInWithProfile(page);

  const screens: [string, string, () => Promise<unknown>][] = [
    ['dashboard', '/', () => expect(page.getByRole('heading', { name: 'My jobs' })).toBeVisible()],
    ['new job', '/jobs/new', () => expect(page.getByLabel('Job description')).toBeVisible()],
    [
      'profile',
      '/profile',
      () =>
        expect(page.getByRole('heading', { level: 2, name: 'Experience' }).first()).toBeVisible(),
    ],
    [
      'job review',
      reviewUrl,
      () => expect(page.locator('[data-test=matched]')).toContainText('Kafka'),
    ],
  ];
  for (const [screen, url, ready] of screens) {
    await test.step(screen, async () => {
      await page.goto(url);
      await ready();
      for (const scheme of schemes) {
        await page.emulateMedia({ colorScheme: scheme });
        await expectAccessible(page, screen, scheme);
      }
    });
  }

  expect(violations).toEqual([]);
});
