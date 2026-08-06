import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const calls = [];
await ctx.route('**/api/views/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  calls.push(`${req.method()} ${url.pathname}`);
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ views: req.method() === 'GET' ? 1204 : 1205 })
  });
});

// 1. article page: meta should now end at "... · 1.2k views" — the trailing
// "· 0% read" is gone with the readout (the fixed bar carries progress)
// domcontentloaded + settle, not networkidle — the dev server's HMR socket and
// the views POST keep the network from idling 500ms, so networkidle times out
await page.goto('http://localhost:4321/writing/event-loop-in-javascript', {
  waitUntil: 'domcontentloaded'
});
await page.waitForTimeout(700);
const metaFilled = (await page.textContent('.meta')).replace(/\s+/g, ' ').trim();

// 2. view-transition navigation: island must POST again on arrival
await page.click('a.crumb'); // -> /writing
await page.waitForURL('**/writing');
await page.waitForTimeout(600);

// 3. home page: POST /api/views/home (normalized '/home' server-side)
await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

// 4. zero-views case: span must stay empty -> hidden, no stray separator
await ctx.unroute('**/api/views/**');
await ctx.route('**/api/views/**', (route) =>
  route.fulfill({ contentType: 'application/json', body: '{"views":0}' })
);
// domcontentloaded + settle, not networkidle — the dev server's HMR socket and
// the views POST keep the network from idling 500ms, so networkidle times out
await page.goto('http://localhost:4321/writing/event-loop-in-javascript', {
  waitUntil: 'domcontentloaded'
});
await page.waitForTimeout(700);
const metaZero = (await page.textContent('.meta')).replace(/\s+/g, ' ').trim();
const viewsHidden = await page.evaluate(
  () => getComputedStyle(document.querySelector('.meta .views')).display === 'none'
);

console.log(JSON.stringify({ metaFilled, metaZero, viewsHidden, calls }, null, 2));
await browser.close();
