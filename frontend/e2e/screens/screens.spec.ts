import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { signInWithProfile } from '../session';
import { expectScheme, settleAnimations } from '../settle';

const sizes = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;
const schemes = ['light', 'dark'] as const;
const outDir = join(__dirname, '..', '..', 'screens');

interface Screen {
  name: string;
  url: string;
  ready: (page: Page) => Promise<unknown>;
}

/** A page wider than the viewport scrolls sideways on a phone, and full-page shots grow wider. */
async function expectNoHorizontalScroll(page: Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect.soft(scrollWidth, `${label}: page width`).toBeLessThanOrEqual(innerWidth);
}

// Screens share one signed-in page, so they run in order and stop together if the sign-in fails.
test.describe.configure({ mode: 'serial' });

let page: Page;
let screens: Screen[];

test.beforeAll(async ({ browser, baseURL }) => {
  await mkdir(outDir, { recursive: true });
  const context = await browser.newContext({ baseURL, locale: 'en-US' });
  page = await context.newPage();
  const { reviewUrl } = await signInWithProfile(page);
  screens = [
    {
      name: 'dashboard',
      url: '/',
      ready: (p) => expect(p.getByRole('heading', { name: 'My jobs' })).toBeVisible(),
    },
    {
      name: 'new-job',
      url: '/jobs/new',
      ready: (p) => expect(p.getByLabel('Job description')).toBeVisible(),
    },
    {
      name: 'review',
      url: reviewUrl,
      ready: async (p) => {
        await expect(p.locator('[data-test=matched]')).toContainText('Kafka');
        await expect(p.locator('iframe[title="Resume preview"]')).toHaveAttribute('src', /^blob:/);
      },
    },
    {
      name: 'profile',
      url: '/profile',
      ready: (p) =>
        expect(p.getByRole('heading', { level: 2, name: 'Experience' }).first()).toBeVisible(),
    },
  ];
});

test.afterAll(async () => {
  await page.context().close();
});

for (const size of sizes) {
  for (const scheme of schemes) {
    test(`sign-in at ${size.width}px, ${scheme}`, async ({ browser, baseURL }) => {
      // A fresh context: the shared page is signed in and would be redirected away from /login.
      const context = await browser.newContext({
        baseURL,
        locale: 'en-US',
        viewport: size,
        colorScheme: scheme,
      });
      try {
        const signedOut = await context.newPage();
        await signedOut.goto('/login');
        await expect(signedOut.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
        await settleAnimations(signedOut);
        await expectScheme(signedOut, scheme, 'sign-in');
        await expectNoHorizontalScroll(signedOut, 'sign-in');
        await signedOut.screenshot({
          path: join(outDir, `sign-in-${size.width}-${scheme}.png`),
          fullPage: true,
        });
      } finally {
        await context.close();
      }
    });

    test(`signed-in screens at ${size.width}px, ${scheme}`, async () => {
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: scheme });
      for (const screen of screens) {
        await page.goto(screen.url);
        await screen.ready(page);
        await settleAnimations(page);
        await expectScheme(page, scheme, screen.name);
        await expectNoHorizontalScroll(page, screen.name);
        await page.screenshot({
          path: join(outDir, `${screen.name}-${size.width}-${scheme}.png`),
          fullPage: true,
        });
      }
    });
  }
}
