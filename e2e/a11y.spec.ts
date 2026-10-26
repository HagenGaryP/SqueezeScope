import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WATCHLIST_KEY = 'squeezescope:watchlist';

// Each route is checked once its main content has rendered.
// `table` additionally waits for a data table, so a broken watchlist seed cannot
// silently fall back to the empty state.
const routes: { path: string; ready: string; table?: boolean }[] = [
  { path: '/', ready: 'Welcome' },
  { path: '/screener', ready: 'Screener' },
  { path: '/screener?siMin=10&catalyst=1&sort=dtc&dir=desc', ready: 'Screener' },
  { path: '/ticker/TNYA', ready: 'TNYA' },
  { path: '/watchlists', ready: 'Watchlist', table: true },
  { path: '/does-not-exist', ready: 'Page not found' },
];

test.beforeEach(async ({ page }) => {
  // Saved tickers so the watchlist renders its table (BBBYQ has a negative % change).
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [WATCHLIST_KEY, JSON.stringify(['TNYA', 'BBBYQ', 'GME'])]
  );
});

for (const { path, ready, table } of routes) {
  test(`no axe violations (WCAG 2.1 A/AA + best practice) on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: ready })).toBeVisible();
    if (table) await expect(page.getByRole('row')).toHaveCount(4); // header + 3 saved tickers

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
    );
    expect(summary).toEqual([]);
  });

  test(`one main landmark and one h1 on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: ready })).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}
