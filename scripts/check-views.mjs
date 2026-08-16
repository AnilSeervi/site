// check-views.mjs — mocks /api/views and asserts the meta views text, a POST per soft-nav arrival,
// and that 0 views leaves the span hidden. Run: node scripts/check-views.mjs
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

// domcontentloaded + settle, not networkidle: the dev HMR socket and the views POST keep the
// network from idling 500ms, so networkidle times out.
await page.goto('http://localhost:4321/writing/event-loop-in-javascript', {
  waitUntil: 'domcontentloaded'
});
await page.waitForTimeout(700);
const metaFilled = (await page.textContent('.meta')).replace(/\s+/g, ' ').trim();

// soft nav: the island must POST again on arrival
await page.click('a.crumb'); // -> /writing
await page.waitForURL('**/writing');
await page.waitForTimeout(600);

// home posts to /api/views/home — the server normalizes '/' to '/home'
await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

await ctx.unroute('**/api/views/**');
await ctx.route('**/api/views/**', (route) =>
  route.fulfill({ contentType: 'application/json', body: '{"views":0}' })
);
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
