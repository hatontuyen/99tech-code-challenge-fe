import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage of the swap flows against the real app and the real
 * price feed. Run with `npm run e2e`.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for live prices to land (skeleton disappears, inputs render).
  await page.waitForSelector('#amount-from', { timeout: 15_000 });
});

test('quotes the receive side from the pay side at the live rate', async ({ page }) => {
  await page.fill('#amount-from', '1.5');
  const toValue = await page.inputValue('#amount-to');
  expect(Number(toValue)).toBeGreaterThan(0);

  // The quote must be internally consistent with the displayed rate line:
  // (1 FROM = R TO) → 1.5 * R * (1 - 0.25% fee) ≈ received amount.
  const rateText = await page.locator('.rate-toggle').textContent();
  const rate = Number(rateText!.match(/= ([\d,.]+)/)![1].replace(/,/g, ''));
  expect(Number(toValue)).toBeCloseTo(1.5 * rate * 0.9975, 0);
});

test('editing the receive side derives the pay side (bi-directional)', async ({ page }) => {
  await page.fill('#amount-to', '100');
  expect(Number(await page.inputValue('#amount-from'))).toBeGreaterThan(0);
});

test('token modal searches and selects with the keyboard', async ({ page }) => {
  await page.click('.token-btn >> nth=1');
  await expect(page.locator('.modal')).toBeVisible();

  await page.fill('.modal__search', 'atom');
  await expect(page.locator('.token-row').first()).toContainText('ATOM');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('.modal')).toBeHidden();
});

test('selecting the counterpart token flips the pair instead of erroring', async ({ page }) => {
  const fromBefore = await page.locator('.token-btn').first().textContent();
  await page.click('.token-btn >> nth=1'); // open "receive" selector
  await page.fill('.modal__search', fromBefore!.trim().split(/\s/)[0]!);
  await page.locator('.token-row').first().click();
  const toAfter = await page.locator('.token-btn').nth(1).textContent();
  expect(toAfter).toContain(fromBefore!.trim().split(/\s/)[0]!);
});

test('max-fill, submit, and success receipt', async ({ page }) => {
  await page.click('.mini-btn >> nth=1'); // Max
  await expect(page.locator('button[type=submit]')).toBeEnabled();
  await page.click('button[type=submit]');
  // While the (simulated) transaction is in flight the whole form is locked —
  // the quote the user confirmed is the quote that executes.
  await expect(page.locator('#amount-from')).toBeDisabled();
  await expect(page.locator('.card--success')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.success-summary')).toContainText('→');

  // "Make another swap" resets the form.
  await page.click('.submit-btn');
  await expect(page.locator('#amount-from')).toHaveValue('');
});

test('insufficient balance disables submit and explains why', async ({ page }) => {
  await page.fill('#amount-from', '999999999');
  await expect(page.locator('button[type=submit]')).toBeDisabled();
  await expect(page.locator('button[type=submit]')).toContainText('Insufficient');
  await expect(page.locator('.field-error')).toContainText('Try “Max”');
});

test('amount input sanitizes junk instead of blocking typing', async ({ page }) => {
  await page.fill('#amount-from', 'abc1,5xyz'); // European decimal comma
  await expect(page.locator('#amount-from')).toHaveValue('1.5');
  await page.fill('#amount-from', '1,234.56'); // US thousands paste — must NOT become 1.23456
  await expect(page.locator('#amount-from')).toHaveValue('1234.56');
  await page.fill('#amount-from', '1,234,567'); // grouped thousands, no decimals
  await expect(page.locator('#amount-from')).toHaveValue('1234567');
});

test('no horizontal overflow on a small phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.fill('#amount-from', '123456.789');
  const overflow = await page.evaluate(() => {
    let max = 0;
    for (const el of document.querySelectorAll('*')) {
      max = Math.max(max, el.getBoundingClientRect().right);
    }
    return max - document.documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0.5);
});
