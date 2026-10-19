import type { Page } from '@playwright/test';

/** Collects the Content-Security-Policy violations the page reports, to assert there are none. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
      violations.push(message.text());
    }
  });
  return violations;
}
