/**
 * check-spark-loader — the hero sparkline's boot → fetch → draw → done sequence.
 * /api/github is stubbed per scenario: the real endpoint is CDN-cached and would
 * only ever exercise the cached path.
 *
 * Usage: node scripts/check-spark-loader.mjs   (dev server on :4321)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';

/* 52-week series — the only requirement is a max > 0 */
const WEEKS = Array.from({ length: 52 }, (_, i) =>
  Math.max(0, Math.round(6 + 5 * Math.sin(i / 4.6) + (i % 7) - 3))
);
const PAYLOAD = {
  weeks: WEEKS,
  followers: 151,
  repoCount: 118,
  stars: 900,
  devfolioStars: 486,
  devfolioForks: 165,
  lastPush: { repo: 'site', commits: 3, ago: '2 hours ago' },
  sparks: {}
};

/** records every data-cap / data-values flip from document_start */
const WATCH = () => {
  window.__t0 = performance.now();
  window.__flips = [];
  new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target;
      if (el.tagName !== 'AS-SPARK') continue;
      window.__flips.push({
        t: Math.round(performance.now() - window.__t0),
        attr: r.attributeName,
        value: el.getAttribute(r.attributeName)
      });
    }
    // `document`, not documentElement — this runs before <html> exists, and
    // observing a node that isn't there yet throws.
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-cap', 'data-values']
  });
};

/** in-page sampler, every 60ms: pixels classed by alpha — baseline 12%, brass 75%, cream head dot 100% */
const SAMPLE = (ms) =>
  new Promise((done) => {
    const out = [];
    const el = document.querySelector('as-spark[data-kind="hero"]');
    const cv = el?.querySelector('canvas');
    const cap = el?.querySelector('.spark-cap');
    const iv = setInterval(() => {
      if (!cv) return;
      const x = cv.getContext('2d');
      const { width: W, height: H } = cv;
      const d = x.getImageData(0, 0, W, H).data;
      let base = 0;
      let brass = 0;
      let cream = 0;
      let edge = -1;
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          const i = (py * W + px) * 4;
          const a = d[i + 3];
          if (a <= 12) continue;
          const isCream = d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 175;
          const isBrass = d[i] > 170 && d[i + 1] > 110 && d[i + 1] < 205 && d[i + 2] < 130;
          if (isCream && a < 90) base++;
          else if (isBrass && a > 90) {
            brass++;
            if (px > edge) edge = px;
          } else if (isCream && a > 150) cream++;
        }
      }
      out.push({
        t: Math.round(performance.now() - window.__t0),
        base,
        brass,
        cream,
        edge,
        capOp: cap ? +getComputedStyle(cap).opacity : null,
        phaseCap: el.getAttribute('data-cap'),
        W
      });
    }, 60);
    setTimeout(() => {
      clearInterval(iv);
      done({ samples: out, flips: window.__flips });
    }, ms);
  });

async function run(name, { delay = 0, status = 200, reduced = false, ms = 3600, width = 1400 }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  await page.addInitScript(WATCH);
  await page.route('**/api/github', async (route) => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (status !== 200) return route.fulfill({ status, body: 'nope' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) });
  });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  // wait out the .as-enter stagger — its translateY(14px) would otherwise read
  // as a layout shift the loader didn't cause.
  await page.waitForTimeout(900);
  const layoutBefore = await page.evaluate(() => ({
    role: document.querySelector('.role')?.getBoundingClientRect().top,
    box: document.querySelector('as-spark[data-kind="hero"]')?.getBoundingClientRect().height
  }));
  const { samples, flips } = await page.evaluate(SAMPLE, ms);
  const layoutAfter = await page.evaluate(() => ({
    role: document.querySelector('.role')?.getBoundingClientRect().top,
    box: document.querySelector('as-spark[data-kind="hero"]')?.getBoundingClientRect().height
  }));

  const capShown = samples.filter((s) => s.capOp > 0.05);
  const drawing = samples.filter((s) => s.brass > 0 && s.cream > 0);
  const last = samples.at(-1);
  const firstBrass = samples.find((s) => s.brass > 0);

  await ctx.close();
  return {
    name,
    captionEverShown: capShown.length > 0,
    captionWindow: capShown.length ? [capShown[0].t, capShown.at(-1).t] : null,
    capFlips: flips.filter((f) => f.attr === 'data-cap').map((f) => `${f.t}ms:${f.value}`),
    dataSettledAt: flips.find((f) => f.attr === 'data-values')?.t ?? null,
    dataSettledEmpty: flips.find((f) => f.attr === 'data-values')?.value === '[]',
    firstBrassAt: firstBrass?.t ?? null,
    headDotFrames: drawing.length,
    revealEdges: drawing.map((s) => s.edge),
    final: { base: last.base, brass: last.brass, cream: last.cream, W: last.W },
    baselineAtBoot: samples[0] ? { t: samples[0].t, base: samples[0].base, brass: samples[0].brass } : null,
    roleShift: +(layoutAfter.role - layoutBefore.role).toFixed(2),
    boxHeight: [layoutBefore.box, layoutAfter.box]
  };
}

const browser = await chromium.launch();
const results = [];
results.push(await run('delayed 1800ms', { delay: 1800 }));
// instant data beats the typing — the caption must never appear
results.push(await run('instant', { delay: 0 }));
results.push(await run('500 after 1800ms', { delay: 1800, status: 500 }));
results.push(await run('500 instant', { delay: 0, status: 500 }));
results.push(await run('reduced motion', { delay: 0, reduced: true, ms: 2000 }));
results.push(await run('mobile 390', { delay: 600, width: 390 }));

/**
 * Leaving mid-draw: a view transition can swap the page out with the rAF running.
 * The returning page must start from `boot` (no data-values), not inherit state.
 */
async function runNav() {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/api/github', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) })
  );

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  // typing ends ~1.3s in and the reveal runs 900ms — 1.6s lands inside it
  await page.waitForTimeout(1600);
  const midDraw = await page.evaluate(() => {
    const cv = document.querySelector('as-spark[data-kind="hero"] canvas');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let ink = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 90) ink++;
    return ink;
  });
  await page.click('header a[href="/work"]');
  await page.waitForTimeout(700);
  await page.goBack();
  await page.waitForTimeout(400);
  const onReturn = await page.evaluate(() => {
    const el = document.querySelector('as-spark[data-kind="hero"]');
    return { values: el?.getAttribute('data-values') ?? 'ABSENT', cap: el?.getAttribute('data-cap') };
  });
  await page.waitForTimeout(2600);
  const settled = await page.evaluate(() => {
    const el = document.querySelector('as-spark[data-kind="hero"]');
    const cv = el.querySelector('canvas');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let ink = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 90) ink++;
    return { ink, hasValues: !!el.dataset.values };
  });
  await ctx.close();
  return { name: 'nav away mid-draw', midDrawInk: midDraw, onReturn, settled, errors };
}
results.push(await runNav());
await browser.close();

for (const r of results) {
  const { revealEdges, ...rest } = r;
  // the edge series is too long to print — show its ends (nav scenario has none)
  const edges =
    revealEdges && revealEdges.length > 8 ? [revealEdges[0], '…', revealEdges.at(-1)] : revealEdges;
  console.log(JSON.stringify(edges ? { ...rest, revealEdges: edges } : rest, null, 1));
}
