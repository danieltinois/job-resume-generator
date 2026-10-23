import { expect, type Page } from '@playwright/test';

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

/** The `--app-bg` token of each scheme, as the browser computes it for `body`. */
const background = { light: 'rgb(250, 250, 250)', dark: 'rgb(9, 9, 11)' } as const;

/**
 * Proves `emulateMedia` really switched the theme: `body` has the scheme's background. Call it
 * after `settleAnimations`, so the 150 ms colour transition is over. Soft, so a run reports all.
 */
export async function expectScheme(page: Page, scheme: keyof typeof background, label: string) {
  await expect
    .soft(page.locator('body'), `${label} (${scheme}) background`)
    .toHaveCSS('background-color', background[scheme]);
}
