// check-phase4.mjs — three home/writing/article nav cycles: islands keep painting, and timers
// plus window/document listeners must not accumulate. Run: node scripts/check-phase4.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1000, height: 1000 },
  deviceScaleFactor: 2
});
const page = await ctx.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('[console] ' + msg.text());
});
page.on('pageerror', (err) => errors.push('[pageerror] ' + String(err)));

// Patch timers + listeners before any page script runs, or early registrations go uncounted.
await page.addInitScript(() => {
  const w = window;
  if (w.__mem) return;
  const mem = (w.__mem = {
    intervals: new Map(), // id -> fn source snippet
    winListeners: new Map(), // type -> count
    docListeners: new Map()
  });
  const si = w.setInterval.bind(w);
  const ci = w.clearInterval.bind(w);
  w.setInterval = (fn, ms, ...a) => {
    const id = si(fn, ms, ...a);
    mem.intervals.set(id, String(fn).slice(0, 120) + ' @' + ms + 'ms');
    return id;
  };
  w.clearInterval = (id) => {
    mem.intervals.delete(id);
    return ci(id);
  };
  const bump = (map, type, d) => map.set(type, (map.get(type) ?? 0) + d);
  const wAdd = w.addEventListener.bind(w);
  const wRem = w.removeEventListener.bind(w);
  w.addEventListener = (t, fn, o) => {
    bump(mem.winListeners, t, 1);
    return wAdd(t, fn, o);
  };
  w.removeEventListener = (t, fn, o) => {
    bump(mem.winListeners, t, -1);
    return wRem(t, fn, o);
  };
  const dAdd = document.addEventListener.bind(document);
  const dRem = document.removeEventListener.bind(document);
  document.addEventListener = (t, fn, o) => {
    bump(mem.docListeners, t, 1);
    return dAdd(t, fn, o);
  };
  document.removeEventListener = (t, fn, o) => {
    bump(mem.docListeners, t, -1);
    return dRem(t, fn, o);
  };
});

const memSnap = () =>
  page.evaluate(() => ({
    intervals: [...window.__mem.intervals.values()],
    win: Object.fromEntries([...window.__mem.winListeners].filter(([, v]) => v !== 0)),
    doc: Object.fromEntries([...window.__mem.docListeners].filter(([, v]) => v !== 0))
  }));

const canvasAlive = (sel) =>
  page.evaluate((s) => {
    const cv = document.querySelector(s);
    if (!cv) return { found: false };
    const x = cv.getContext('2d');
    const d = x.getImageData(0, 0, cv.width, cv.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return { found: true, painted, total: d.length / 4 };
  }, sel);

const settle = async () => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);
};

const results = {};

await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });

// grab animation state ASAP, while .as-enter animations are still running/pending
results.staggerAnimations = await page.evaluate(() => {
  return [...document.querySelectorAll('.as-enter')].map((el) => {
    const cs = getComputedStyle(el);
    return {
      tag:
        el.tagName.toLowerCase() +
        (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
      name: cs.animationName,
      delay: cs.animationDelay,
      running: el.getAnimations().length
    };
  });
});
await settle();

const homeCheck = async (label) => {
  const clock = await page.textContent('as-clock');
  const portrait = await canvasAlive('as-ascii-portrait canvas');
  const spark = await canvasAlive('as-spark[data-kind="hero"] canvas');
  const rowSpark = await canvasAlive('.prow as-spark canvas');
  const ticker = await page.evaluate(() => ({
    label: document.querySelector('[data-ticker-label]')?.textContent,
    value: document.querySelector('[data-ticker-value]')?.textContent
  }));
  const h1 = await page.textContent('h1');
  results[label] = { clock, portrait, spark, rowSpark, ticker, h1 };
};
await homeCheck('home_initial');

const cycle = async (n) => {
  await page.click('nav a[href="/writing"]');
  await settle();
  const dots = await canvasAlive('as-dot-field canvas');
  // wiggle pointer so dot field reacts (also proves listener alive)
  await page.mouse.move(500, 500);
  await page.waitForTimeout(120);
  const dotsAfterMove = await canvasAlive('as-dot-field canvas');
  results['writing_c' + n] = { dots, dotsAfterMove, url: page.url() };

  await page.click('.rows a.row');
  await settle();
  results['article_c' + n] = {
    url: page.url(),
    progress: await page.evaluate(() => !!document.querySelector('as-progress .fill'))
  };

  await page.goBack();
  await settle();
  results['back_c' + n] = {
    url: page.url(),
    dots: await canvasAlive('as-dot-field canvas')
  };

  await page.click('.brand');
  await settle();
  await page.waitForTimeout(1400); // let typeon finish + its interval self-clear
  await homeCheck('home_c' + n);
  results['mem_c' + n] = await memSnap();
};

for (let n = 1; n <= 3; n++) await cycle(n);

await page.keyboard.press('Meta+k');
await page.waitForTimeout(400);
results.paletteOpen = await page.evaluate(
  () => document.querySelector('as-palette')?.hasAttribute('data-open') ?? false
);
await page.keyboard.press('Escape');

results.errors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
