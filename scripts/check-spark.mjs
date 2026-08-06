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
await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const hero = await page.$eval('as-spark[data-kind="hero"]', eval(sampleFn));
const homeRows = await page.$$eval('as-spark:not([data-kind="hero"])', (els, fnSrc) => {
  const fn = eval(fnSrc);
  return els.map((el) => ({ status: el.dataset.status, seed: el.dataset.seed, ...fn(el) }));
}, sampleFn);

// The hero must draw the REAL contribution series and must NOT match the old
// synthetic seed-7 curve. That fallback used to render an invented commit
// history on every first paint (and permanently if /api/github failed); it's
// gone, so a match here would be a regression, not a pass.
const heroCheck = await page.evaluate(() => {
  const el = document.querySelector('as-spark[data-kind="hero"]');
  const cv = el.querySelector('canvas');
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;

  const inkNear = (ex, ey) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const px = Math.round(ex + dx), py = Math.round(ey + dy);
        if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
        if (d[(py * cv.width + px) * 4 + 3] > 40) return true;
      }
    return false;
  };
  // the island's own geometry: w=320, h=22, bottom=h-2, usable=h-5, backing 2x
  const hits = (series) => {
    const top = Math.max(...series, 0.001);
    return series.filter((v, i) =>
      inkNear(i * (320 / (series.length - 1)) * 2, (20 - (v / top) * 17) * 2)
    ).length;
  };

  const real = el.dataset.values ? JSON.parse(el.dataset.values) : null;

  // the retired fallback, recomputed here purely to prove it is NOT on screen
  const mul = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rnd = mul(7), synth = [];
  for (let w = 0; w < 52; w++) { let v = 0; for (let k = 0; k < 7; k++) v += Math.max(0, Math.sin(w / 4.6) * 0.7 + rnd() * 1.5 - 0.55); synth.push(v); }

  return {
    hasRealData: !!real,
    realSum: real ? +real.reduce((a, c) => a + c, 0).toFixed(2) : null,
    realHits: real ? hits(real) : 0,
    realTotal: real ? real.length : 0,
    syntheticHits: hits(synth),
    syntheticTotal: synth.length,
    verdict:
      real && hits(real) / real.length > 0.9 && hits(synth) / synth.length < 0.7
        ? 'real series drawn, synthetic absent'
        : 'CHECK — see counts'
  };
});

// ---- WORK ----
// The 6b handoff removed per-project sparklines from this page entirely, so the
// assertion is now an absence: any <as-spark> here is a regression.
await page.goto('http://localhost:4321/work', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
const workRows = { sparkCount: await page.locator('as-spark').count(), expected: 0 };

console.log(JSON.stringify({ hero, heroCheck, homeRows, workRows }, null, 1));
await browser.close();
