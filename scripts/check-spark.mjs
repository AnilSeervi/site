import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// helper injected in page: sample a canvas, return stroke pixel stats + a shape signature
const sampleFn = `(el) => {
  const cv = el.querySelector('canvas');
  if (!cv) return { error: 'no canvas' };
  const x = cv.getContext('2d');
  const { width: W, height: H } = cv;
  const d = x.getImageData(0, 0, W, H).data;
  let n = 0, r = 0, g = 0, b = 0, a = 0, maxA = 0;
  // per-column topmost stroke y → shape signature
  const cols = [];
  for (let px = 0; px < W; px += Math.max(1, Math.floor(W / 24))) {
    let topY = -1;
    for (let py = 0; py < H; py++) {
      const i = (py * W + px) * 4;
      if (d[i + 3] > 20) { if (topY < 0) topY = py; }
    }
    cols.push(topY);
  }
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 20) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; maxA = Math.max(maxA, d[i + 3]); }
  }
  const cssOpacity = getComputedStyle(cv).opacity;
  return n
    ? { n, avg: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], avgA: +(a / n / 255).toFixed(3), maxA: +(maxA / 255).toFixed(3), cssOpacity, sig: cols.join(','), W, H }
    : { n: 0, cssOpacity, W, H };
}`;

// ---- HOME ----
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const hero = await page.$eval('as-spark[data-kind="hero"]', eval(sampleFn));
const homeRows = await page.$$eval('as-spark:not([data-kind="hero"])', (els, fnSrc) => {
  const fn = eval(fnSrc);
  return els.map((el) => ({ status: el.dataset.status, seed: el.dataset.seed, ...fn(el) }));
}, sampleFn);

// verify hero dataset matches prototype exactly: recompute seed-7 series in page & compare drawn polyline
const heroCheck = await page.evaluate(() => {
  const mul = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rnd = mul(7), wk = [];
  for (let w = 0; w < 52; w++) { let s = 0; for (let d = 0; d < 7; d++) s += Math.max(0, Math.sin(w / 4.6) * 0.7 + rnd() * 1.5 - 0.55); wk.push(s); }
  const top = Math.max.apply(null, wk);
  // expected canvas-space (2x) points
  const pts = wk.map((v, w) => [w * (320 / 51) * 2, (20 - (v / top) * 17) * 2]);
  const cv = document.querySelector('as-spark[data-kind="hero"] canvas');
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  // check stroke alpha near each expected point (within 3px radius)
  let hit = 0;
  for (const [ex, ey] of pts) {
    let found = false;
    for (let dy = -4; dy <= 4 && !found; dy++) for (let dx = -4; dx <= 4 && !found; dx++) {
      const px = Math.round(ex + dx), py = Math.round(ey + dy);
      if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
      if (d[(py * cv.width + px) * 4 + 3] > 40) found = true;
    }
    if (found) hit++;
  }
  return { hit, total: pts.length, top: +top.toFixed(4), wk0: +wk[0].toFixed(4), wk51: +wk[51].toFixed(4) };
});

// ---- WORK ----
await page.goto('http://localhost:4321/work', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const workRows = await page.$$eval('as-spark', (els, fnSrc) => {
  const fn = eval(fnSrc);
  return els.map((el) => ({ status: el.dataset.status, seed: el.dataset.seed, ...fn(el) }));
}, sampleFn);

console.log(JSON.stringify({ hero, heroCheck, homeRows, workRows }, null, 1));
await browser.close();
