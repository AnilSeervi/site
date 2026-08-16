// check-dot-field.mjs — <as-dot-field> pixel sampling (baseline/hover/resize), rAF throttling,
// and listener leaks over 3 soft navs. Run: node scripts/check-dot-field.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Patch window listener bookkeeping + rAF counter before any page script runs.
await page.addInitScript(() => {
  window.__lc = { outstanding: {}, raf: 0 };
  const track = ['pointermove', 'pointerout', 'pointerleave', 'resize'];
  const origAdd = window.addEventListener.bind(window);
  const origRem = window.removeEventListener.bind(window);
  window.addEventListener = function (type, fn, opts) {
    if (track.includes(type)) {
      (window.__lc.outstanding[type] ||= []).push(fn);
    }
    return origAdd(type, fn, opts);
  };
  window.removeEventListener = function (type, fn, opts) {
    if (track.includes(type) && window.__lc.outstanding[type]) {
      const i = window.__lc.outstanding[type].indexOf(fn);
      if (i >= 0) window.__lc.outstanding[type].splice(i, 1);
    }
    return origRem(type, fn, opts);
  };
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    window.__lc.raf++;
    return origRaf(cb);
  };
});

await page.goto('http://localhost:4321/writing', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

const out = {};

out.geometry = await page.evaluate(() => {
  const cv = document.querySelector('as-dot-field canvas');
  if (!cv) return { found: false };
  const r = cv.getBoundingClientRect();
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    backing: { w: cv.width, h: cv.height },
    viewport: { w: innerWidth, h: innerHeight },
    dotGridPresent: !!document.querySelector('.dot-grid'),
    dotGridBgCount: [...document.querySelectorAll('*')].filter((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      return bg && bg.includes('radial-gradient');
    }).length
  };
});

const samplePixel = (cssX, cssY) =>
  page.evaluate(
    ([x, y]) => {
      const cv = document.querySelector('as-dot-field canvas');
      const d = cv.getContext('2d').getImageData(x * 2, y * 2, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    },
    [cssX, cssY]
  );

// Dot lattice: px = 13 + 26k. Near-center dot for a 1280x800 viewport: (637, 403).
const HOT = [637, 403]; // dot we point at (g = 1)
const MID = [845, 403]; // ~208px away: g ~ .11 -> cream, brightened
const FAR = [13, 13]; // ~733px away: g ~ 0 -> baseline

out.baseline = {
  hot: await samplePixel(...HOT),
  far: await samplePixel(...FAR),
  gap: await samplePixel(HOT[0] + 13, HOT[1] + 13) // between dots: must be transparent
};

await page.mouse.move(HOT[0], HOT[1]);
await page.waitForTimeout(150);
out.hover = {
  hot: await samplePixel(...HOT),
  mid: await samplePixel(...MID),
  far: await samplePixel(...FAR)
};

out.rafBurst = await page.evaluate(() => {
  const before = window.__lc.raf;
  for (let i = 0; i < 60; i++) {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 600 + i, clientY: 400 }));
  }
  return window.__lc.raf - before;
});
await page.waitForTimeout(100);

await page.mouse.move(5, 780);
await page.waitForTimeout(150);
out.afterAway = { hot: await samplePixel(...HOT) };

await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(300);
out.afterResize = await page.evaluate(() => {
  const cv = document.querySelector('as-dot-field canvas');
  const r = cv.getBoundingClientRect();
  return {
    rect: { w: r.width, h: r.height },
    backing: { w: cv.width, h: cv.height },
    viewport: { w: innerWidth, h: innerHeight }
  };
});
out.afterResize.dot = await samplePixel(13, 13);

const counts = () =>
  page.evaluate(() =>
    Object.fromEntries(Object.entries(window.__lc.outstanding).map(([k, v]) => [k, v.length]))
  );
const clientNav = async (href) => {
  await page.evaluate((h) => {
    const a = document.createElement('a');
    a.href = h;
    document.body.appendChild(a);
    a.click();
  }, href);
  await page.waitForTimeout(500);
};

out.leak = { start: await counts(), rounds: [] };
for (let i = 0; i < 3; i++) {
  await clientNav('/');
  const onHome = await counts();
  await clientNav('/writing');
  const onWriting = await counts();
  out.leak.rounds.push({ onHome, onWriting });
}
out.leak.sameWindow = await page.evaluate(() => !!window.__lc);

out.final = await page.evaluate(() => ({
  canvases: document.querySelectorAll('as-dot-field canvas').length,
  dotGridPresent: !!document.querySelector('.dot-grid'),
  url: location.pathname
}));
out.final.dot = await samplePixel(13, 13);

console.log(JSON.stringify(out, null, 2));
await browser.close();
