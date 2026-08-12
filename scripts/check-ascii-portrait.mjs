// check-ascii-portrait.mjs — <as-ascii-portrait> render/shimmer/hover on / and /about, 90ms
// interval leaks over 3 soft navs, reduced-motion static. Run: node scripts/check-ascii-portrait.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};

const SAMPLE = `(sel) => {
  const cv = document.querySelector(sel);
  if (!cv) return null;
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  let sum = 0, hash = 0 >>> 0;
  const distinct = new Set();
  for (let i = 0; i < d.length; i += 4) {
    sum += d[i];
    distinct.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    hash = ((hash * 31) + d[i] + d[i + 1] + d[i + 2]) >>> 0;
  }
  return { mean: sum / (d.length / 4), distinct: distinct.size, hash };
}`;

// mean red-channel brightness in a backing-pixel box centered on the canvas
const REGION = `(args) => {
  const cv = document.querySelector(args.sel);
  const x = cv.getContext('2d');
  const bx = Math.round(cv.width / 2 - args.half), by = Math.round(cv.height / 2 - args.half);
  const d = x.getImageData(bx, by, args.half * 2, args.half * 2).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i];
  return sum / (d.length / 4);
}`;

async function checkPage(ctx, url, key) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400); // let portrait load + first draws happen
  const sel = 'as-ascii-portrait canvas';

  const s1 = await page.evaluate(eval(SAMPLE), sel);
  await page.waitForTimeout(200);
  const s2 = await page.evaluate(eval(SAMPLE), sel);

  const box = await page.locator(sel).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const baseline = await page.evaluate(eval(REGION), { sel, half: 60 });
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(250);
  const hovered = await page.evaluate(eval(REGION), { sel, half: 60 });
  // move off the canvas so pointerleave actually fires
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  const afterLeave = await page.evaluate(eval(REGION), { sel, half: 60 });

  out[key] = {
    rendered: s1 && s1.distinct > 10, // non-uniform pixel data
    distinct: s1 && s1.distinct,
    shimmer: s1 && s2 && s1.hash !== s2.hash,
    baseline: +baseline.toFixed(2),
    hovered: +hovered.toFixed(2),
    afterLeave: +afterLeave.toFixed(2),
    hoverBrightens: hovered > baseline * 1.1,
    leaveReturns: Math.abs(afterLeave - baseline) < Math.abs(hovered - baseline) * 0.35
  };
  await page.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await checkPage(ctx, 'http://localhost:4321/', 'home');
  await checkPage(ctx, 'http://localhost:4321/about', 'about');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    window.__ivals = new Map();
    const oSet = window.setInterval.bind(window);
    const oClr = window.clearInterval.bind(window);
    window.setInterval = (fn, delay, ...a) => {
      const id = oSet(fn, delay, ...a);
      window.__ivals.set(id, delay);
      return id;
    };
    window.clearInterval = (id) => {
      window.__ivals.delete(id);
      return oClr(id);
    };
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const count90 = () =>
    page.evaluate(() => [...window.__ivals.values()].filter((d) => d === 90).length);
  out.leak = { initial90: await count90(), trips: [] };
  for (let i = 0; i < 3; i++) {
    await page.click('a[href="/work"]');
    await page.waitForURL('**/work');
    await page.waitForTimeout(500);
    const onWork = await count90();
    await page.click('a[href="/"]');
    await page.waitForURL('http://localhost:4321/');
    await page.waitForTimeout(500);
    const backHome = await count90();
    out.leak.trips.push({ onWork, backHome });
  }
  out.leak.clientRouted = await page.evaluate(() => !!window.__ivals); // still same document = no full reloads
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    reducedMotion: 'reduce'
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const sel = 'as-ascii-portrait canvas';
  const r1 = await page.evaluate(eval(SAMPLE), sel);
  await page.waitForTimeout(220);
  const r2 = await page.evaluate(eval(SAMPLE), sel);
  out.reducedMotion = {
    rendered: r1 && r1.distinct > 10,
    distinct: r1 && r1.distinct,
    static: r1 && r2 && r1.hash === r2.hash
  };
  await ctx.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
