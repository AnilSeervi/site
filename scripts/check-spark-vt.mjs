// check-spark-vt.mjs — soft-navs home → /work, reports painted px per as-spark canvas. Run: node scripts/check-spark-vt.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
).newPage();
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const hasVT = await page.evaluate(() => !!document.querySelector('a[href="/work"]'));
await page.click('header a[href="/work"], nav a[href="/work"], a[href="/work"]');
await page.waitForURL('**/work');
await page.waitForTimeout(600);
const rows = await page.$$eval('as-spark canvas', (cvs) =>
  cvs.map((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
    return n;
  })
);
console.log(JSON.stringify({ hasVT, painted: rows }));
await browser.close();
