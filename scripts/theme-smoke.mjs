import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('ira-theme')), 'dark');
  await page.screenshot({ path: 'test-results/rehearsal/theme-dark.png', fullPage: true });
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.screenshot({ path: 'test-results/rehearsal/theme-light.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['dark toggle', 'preference persisted after reload', 'light toggle', 'no JavaScript errors'], screenshots: ['test-results/rehearsal/theme-light.png', 'test-results/rehearsal/theme-dark.png'] }, null, 2));
} finally {
  await browser.close();
}
