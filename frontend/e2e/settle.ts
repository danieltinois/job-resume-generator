import type { Page } from '@playwright/test';

/**
 * Waits for the finite animations to end. Switching the colour scheme starts 150 ms colour
 * transitions; axe and screenshots must see the settled colours, not a mid-fade frame.
 */
export async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}
