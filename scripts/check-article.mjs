import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
  permissions: ['clipboard-read', 'clipboard-write']
});
const page = await ctx.newPage();
// domcontentloaded + an explicit settle, not networkidle: the dev server never
// goes quiet for 500ms straight (HMR socket + the views POST), so networkidle
// times out at 30s. Same house pattern as check-moving / check-live.
await page.goto('http://localhost:4321/writing/event-loop-in-javascript', {
  waitUntil: 'domcontentloaded'
});
await page.waitForTimeout(700);

// the `NN% read` readout is gone — it scrolled out of view before it read
// anything but 0%. The fixed bar is the only progress indicator now, so the
// fill width is what gets asserted, at rest and after scrolling.
const fill = () => page.evaluate(() => document.querySelector('as-progress .fill').style.width);
const initial = await fill();

await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.4));
await page.waitForTimeout(300);
const fillWidth = await fill();
const scrolled = parseFloat(fillWidth) > parseFloat(initial || '0') ? 'grew' : 'STUCK';

await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(200);
await page.click('.prose pre');
const copied = await page.evaluate(() =>
  document.querySelector('.prose pre').hasAttribute('data-copied')
);
const clip = await page.evaluate(() => navigator.clipboard.readText());
await page.waitForTimeout(1800);
const reset = await page.evaluate(() =>
  document.querySelector('.prose pre').hasAttribute('data-copied')
);

console.log(
  JSON.stringify({
    initial,
    scrolled,
    fillWidth,
    copied,
    clipStart: clip.slice(0, 40),
    resetAfter1600: !reset
  })
);

await page.screenshot({ path: process.argv[2], clip: { x: 0, y: 0, width: 1400, height: 900 } });
await browser.close();
