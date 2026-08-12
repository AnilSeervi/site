// check-clock-ticker.mjs — src/islands/clock.ts + ticker.ts: rendered IST vs computed IST (context
// tz America/New_York), 8s rotation/order/opacity dips, interval counts stable over 3 soft navs.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  timezoneId: 'America/New_York'
});
const page = await ctx.newPage();

// Patch timers before any page script runs. window persists across ClientRouter navs.
await page.addInitScript(() => {
  window.__timers = { intervals: new Map(), timeouts: new Map() };
  const si = window.setInterval.bind(window);
  const ci = window.clearInterval.bind(window);
  const st = window.setTimeout.bind(window);
  const ct = window.clearTimeout.bind(window);
  window.setInterval = (fn, delay, ...a) => {
    const id = si(fn, delay, ...a);
    window.__timers.intervals.set(id, delay);
    return id;
  };
  window.clearInterval = (id) => {
    window.__timers.intervals.delete(id);
    return ci(id);
  };
  window.setTimeout = (fn, delay, ...a) => {
    const id = st(fn, delay, ...a);
    window.__timers.timeouts.set(id, delay);
    return id;
  };
  window.clearTimeout = (id) => {
    window.__timers.timeouts.delete(id);
    return ct(id);
  };
  window.__activeIntervals = () => [...window.__timers.intervals.values()];
});

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// ---------- CLOCK ----------
const clockText = await page.textContent('as-clock[data-greeting]');
const nowMs = Date.now();
const istParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).formatToParts(new Date(nowMs));
const istH = Number(istParts.find((p) => p.type === 'hour').value) % 24;
const istM = Number(istParts.find((p) => p.type === 'minute').value);
const expectGreet =
  istH < 5
    ? 'up too late'
    : istH < 12
      ? 'good morning'
      : istH < 17
        ? 'good afternoon'
        : istH < 22
          ? 'good evening'
          : 'winding down';

const m = clockText.match(
  /^(\d{2}):(\d{2}) ist · (up too late|good morning|good afternoon|good evening|winding down), from bengaluru$/
);
let clockOk = false;
let clockDiffMin = null;
let greetOk = false;
if (m) {
  const shownMin = Number(m[1]) * 60 + Number(m[2]);
  const trueMin = istH * 60 + istM;
  const raw = Math.abs(shownMin - trueMin);
  clockDiffMin = Math.min(raw, 1440 - raw);
  clockOk = clockDiffMin <= 1;
  greetOk = m[3] === expectGreet;
}
const browserTz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
const clockIntervals = await page.evaluate(() => window.__activeIntervals());

// ---------- TICKER ----------
const transitions = await page.evaluate(() => ({
  label: getComputedStyle(document.querySelector('[data-ticker-label]')).transition,
  value: getComputedStyle(document.querySelector('[data-ticker-value]')).transition
}));

const samples = await page.evaluate(async () => {
  const label = document.querySelector('[data-ticker-label]');
  const value = document.querySelector('[data-ticker-value]');
  const out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 8000) {
    out.push({
      t: Math.round(performance.now() - t0),
      label: label.textContent,
      value: value.textContent,
      opL: getComputedStyle(label).opacity,
      opV: getComputedStyle(value).opacity
    });
    await new Promise((r) => requestAnimationFrame(r));
  }
  return out;
});

const labelSeq = [];
for (const s of samples) {
  if (labelSeq[labelSeq.length - 1] !== s.label) labelSeq.push(s.label);
}
const dipCount = samples.filter((s) => Number(s.opL) < 0.5).length;
const minOpacity = Math.min(...samples.map((s) => Number(s.opL)));
const expectedOrder = ['listening', 'shipping', 'moving', 'watching', 'reading'];
let orderOk = labelSeq.length >= 3; // start + >=2 rotations
for (let i = 1; i < labelSeq.length && orderOk; i++) {
  const prev = expectedOrder.indexOf(labelSeq[i - 1]);
  const cur = expectedOrder.indexOf(labelSeq[i]);
  if (prev < 0 || cur < 0 || cur !== (prev + 1) % expectedOrder.length) orderOk = false;
}

const changes = [];
for (let i = 1; i < samples.length; i++) {
  if (samples[i].label !== samples[i - 1].label) changes.push(samples[i].t);
}

// ---------- LEAKS: 3x nav round trips ----------
const counts = [];
const snap = () =>
  page.evaluate(() => {
    const all = window.__activeIntervals();
    return {
      total: all.length,
      d30000: all.filter((d) => d === 30000).length,
      d3400: all.filter((d) => d === 3400).length
    };
  });
counts.push({ where: 'home-initial', ...(await snap()) });
for (let i = 0; i < 3; i++) {
  await page.click('nav a[href="/work"]');
  await page.waitForURL('**/work');
  await page.waitForTimeout(500);
  counts.push({ where: `work-${i + 1}`, ...(await snap()) });
  await page.click('a.brand');
  await page.waitForURL('http://localhost:4321/');
  await page.waitForTimeout(500);
  counts.push({ where: `home-${i + 1}`, ...(await snap()) });
}

console.log(
  JSON.stringify(
    {
      browserTz,
      clock: { clockText, istNow: `${String(istH).padStart(2, '0')}:${String(istM).padStart(2, '0')}`, formatOk: !!m, clockOk, clockDiffMin, expectGreet, greetOk },
      clockIntervalsAtHome: clockIntervals,
      ticker: {
        transitions,
        labelSeq,
        rotations: labelSeq.length - 1,
        orderOk,
        dipSampleCount: dipCount,
        minOpacity,
        swapTimes: changes,
        swapGap: changes.length >= 2 ? changes[1] - changes[0] : null
      },
      leakCounts: counts
    },
    null,
    2
  )
);

await browser.close();
