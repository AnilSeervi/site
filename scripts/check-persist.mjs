import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

await page.evaluate(() => {
  document.querySelector('.dot-grid').__marker = 'kept';
  document.querySelector('.site-header').__marker = 'kept';
});

await page.click('nav a[href="/work"]');
await page.waitForURL('**/work');
await page.waitForTimeout(400);

const result = await page.evaluate(() => ({
  dots: document.querySelector('.dot-grid')?.__marker ?? 'REPLACED',
  header: document.querySelector('.site-header')?.__marker ?? 'REPLACED',
  activeNav: document.querySelector('[data-navlink][data-active]')?.textContent?.trim()
}));

console.log(JSON.stringify(result));
await browser.close();
