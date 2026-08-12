/**
 * check-moving.mjs — the MOVING section (<as-moving>): route etching, vitals,
 * consistency strip, reduced motion, and the home-ticker `moving` item.
 *
 * Usage: node scripts/check-moving.mjs [base-url] [page-path]
 * Env: SHOT_PATH — save a screenshot of the mocked section.
 */
import { chromium } from 'playwright';
import polyline from '@mapbox/polyline';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const PAGE = process.argv[3] ?? '/live';
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const text = async (loc) => (await loc.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

// mocked payload — an encoded loop polyline + 90 mixed days
const IST_MIN = 330;
const istDate = (ms) => new Date(ms + IST_MIN * 60000);

function seeded(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// closed jittered ellipse — first and last point must coincide, hence j = 0 there
const rnd = seeded(7);
const loopPts = [];
for (let i = 0; i <= 48; i++) {
  const t = (2 * Math.PI * i) / 48;
  const j = i === 0 || i === 48 ? 0 : (rnd() - 0.5) * 0.0006;
  loopPts.push([
    12.976 + 0.003 * Math.sin(t) + j,
    77.59 + 0.0048 * Math.cos(t) + j
  ]);
}
const LOOP = polyline.encode(loopPts);

// last Saturday, 06:30 IST (expressed as the true UTC instant)
const nowIst = istDate(Date.now());
const daysSinceSat = (nowIst.getUTCDay() + 1) % 7 || 7; // ≥1 — always in the past
const satIstMidnight = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - daysSinceSat * 86400000;
const latestStart = new Date(satIstMidnight + 6.5 * 3600000 - IST_MIN * 60000).toISOString();

// 90 days, oldest→newest, ~1/4 rest, mixed buckets, deterministic
const BUCKETS = ['run', 'lift', 'racquet'];
const days = [];
const todayIstMidnight = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
for (let i = 89; i >= 0; i--) {
  const d = new Date(todayIstMidnight - i * 86400000);
  const date = d.toISOString().slice(0, 10);
  const r = rnd();
  if (r < 0.24) days.push({ date, seconds: 0, bucket: 'rest' });
  else days.push({ date, seconds: Math.round(1200 + rnd() * 4200), bucket: BUCKETS[Math.floor(rnd() * 3)] });
}
const maxSeconds = Math.max(...days.map((d) => d.seconds));

const STRAVA_MOCK = {
  latest: {
    name: 'Cubbon Park Loop',
    sportType: 'running',
    distanceKm: 12.4,
    movingTime: '58:12',
    paceMinKm: '4:41',
    polyline: LOOP,
    startedAt: latestStart,
    isRun: true
  },
  latestAny: {
    name: 'Morning Run around Cubbon Park',
    sportType: 'running',
    distanceKm: 8.2,
    startedAt: new Date(Date.now() - 30 * 60000).toISOString()
  },
  month: { runKm: 84, activeDays: 18, daysInMonth: 22 },
  days
};
const FITNESS_MOCK = { vo2max: 52, restingHr: 52, source: 'garmin' };

// expected ticker bucket for latestAny (mirrors the island's IST logic)
function expectBucket(iso) {
  const then = istDate(Date.parse(iso));
  const h = then.getUTCHours();
  const slot = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const dd =
    Math.floor(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) / 86400000) -
    Math.floor(Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate()) / 86400000);
  return dd === 0 ? `this ${slot}` : `yesterday ${slot}`;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const latestWeekday = WEEKDAYS[istDate(Date.parse(latestStart)).getUTCDay()];

const mockRoutes = async (page) => {
  await page.route('**/api/moving', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(STRAVA_MOCK) })
  );
  await page.route('**/api/fitness', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(FITNESS_MOCK) })
  );
};

const browser = await chromium.launch();

console.log('\npass 1 · live /api/moving state');
const real = await fetch(`${BASE}/api/moving`).then((r) => r.json());
const page1 = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
await page1.goto(`${BASE}${PAGE}`, { waitUntil: 'domcontentloaded' });
await page1.waitForResponse('**/api/moving', { timeout: 20000 });
await page1.waitForTimeout(500);
if (real.disabled || !Array.isArray(real.days) || real.days.length === 0) {
  check('section renders NOTHING while strava is disabled/down', await page1.locator('as-moving').isHidden());
  check(
    'no visible MOVING header',
    (await page1.locator('text=/MOVING · GARMIN/').count()) === 0 ||
      (await page1.locator('text=/MOVING · GARMIN/').first().isHidden())
  );
} else {
  check('section visible with live data', await page1.locator('as-moving').isVisible());
}
await page1.close();

console.log('\npass 2 · mocked strava + fitness');
const page2 = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await mockRoutes(page2);
await page2.goto(`${BASE}${PAGE}`, { waitUntil: 'domcontentloaded' });
await page2.waitForResponse('**/api/moving', { timeout: 20000 });
await page2.waitForSelector('as-moving:not([hidden])', { timeout: 10000 });
await page2.waitForTimeout(400);

check('section visible', await page2.locator('as-moving').isVisible());
check(
  'section header (Garmin-only, no meta link)',
  (await text(page2.locator('as-moving .section-head .label'))) === 'MOVING · GARMIN'
);

const dBase = await page2.locator('[data-route-base]').getAttribute('d');
const dRunner = await page2.locator('[data-route-runner]').getAttribute('d');
check('base path has a decoded d', !!dBase && dBase.startsWith('M') && dBase.length > 200);
check('runner path shares the same d', dRunner === dBase);
const coords = (dBase ?? '').match(/-?[\d.]+/g)?.map(Number) ?? [];
const xs = coords.filter((_, i) => i % 2 === 0);
const ys = coords.filter((_, i) => i % 2 === 1);
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
check(
  'route normalized into the 230×150 viewBox with ~12px inset',
  minX >= 11.5 && maxX <= 218.5 && minY >= 11.5 && maxY <= 138.5 &&
    (maxX - minX > 200 || maxY - minY > 120),
  `x ${minX.toFixed(1)}–${maxX.toFixed(1)}, y ${minY.toFixed(1)}–${maxY.toFixed(1)}`
);
check(
  'aspect preserved (loop is wider than tall, like the geo box)',
  (maxX - minX) / (maxY - minY) > 1.1,
  `ratio ${((maxX - minX) / (maxY - minY)).toFixed(2)}`
);
const startDot = await page2.locator('[data-route-start]').evaluate((el) => [el.getAttribute('cx'), el.getAttribute('cy')]);
check(
  'start dot sits on the first path point',
  dBase?.startsWith(`M${startDot[0]} ${startDot[1]}`),
  `circle at ${startDot}, d starts ${dBase?.slice(0, 20)}`
);
const runnerAnim = await page2.locator('[data-route-runner]').evaluate((el) => {
  const cs = getComputedStyle(el);
  return `${cs.animationName} ${cs.animationDuration} ${cs.animationTimingFunction} ${cs.animationIterationCount}`;
});
check('runner animates as-run 7s linear infinite', runnerAnim === 'as-run 7s linear infinite', runnerAnim);
check(
  'etch caption',
  (await text(page2.locator('[data-live="etch-cap"]'))) === `the shape of ${latestWeekday} — cubbon park loop`,
  await text(page2.locator('[data-live="etch-cap"]'))
);

check(
  'last run row',
  (await text(page2.locator('[data-live="lastrun"]'))) === `12.4 km · 58:12 · 4:41/km — ${latestWeekday}, before the heat`,
  await text(page2.locator('[data-live="lastrun"]'))
);
check('last run label', (await text(page2.locator('[data-live="lastrun-label"]'))) === 'last run');
check(
  'this month row',
  (await text(page2.locator('[data-live="month"]'))) === '84 km on foot · 18 active days of 22',
  await text(page2.locator('[data-live="month"]'))
);
check(
  'vo2max row',
  (await text(page2.locator('[data-live="vo2max"]'))) === '52 — garmin calls it “superior”; the legs disagree',
  await text(page2.locator('[data-live="vo2max"]'))
);
check(
  'vo2max numeral is accent',
  (await page2.locator('[data-live="vo2max"] .accent').evaluate((el) => getComputedStyle(el).color)) === 'rgb(217, 165, 74)'
);
check(
  'resting hr row',
  (await text(page2.locator('[data-live="rhr"]'))) === '52 bpm — the dot keeps time',
  await text(page2.locator('[data-live="rhr"]'))
);
const dot = await page2.locator('[data-rhr-dot]').evaluate((el) => {
  const cs = getComputedStyle(el);
  return { name: cs.animationName, dur: cs.animationDuration, size: `${el.offsetWidth}×${el.offsetHeight}` };
});
check('rhr dot runs as-beat + as-pulse', dot.name === 'as-beat, as-pulse', dot.name);
const durs = dot.dur.split(',').map((s) => parseFloat(s));
check(
  'rhr dot period ≈ 60/52 ≈ 1.154s (both animations)',
  durs.length === 2 && durs.every((d) => Math.abs(d - 60 / 52) < 0.005),
  dot.dur
);
check('rhr dot is 7×7', dot.size === '7×7');

const bars = page2.locator('[data-strip] span');
check('90 bars', (await bars.count()) === 90);
const barInfo = await page2.locator('[data-strip]').evaluate((strip) => {
  const spans = [...strip.children];
  return spans.map((s) => ({
    h: s.style.height,
    bg: getComputedStyle(s).backgroundColor,
    delay: s.style.animationDelay,
    anim: getComputedStyle(s).animationName
  }));
});
const colorSet = new Set(barInfo.map((b) => b.bg));
check('mixed buckets (4 distinct colors incl. rest)', colorSet.size === 4, [...colorSet].join(' | '));
const runBg = 'rgb(217, 165, 74)';
const liftBg = 'rgb(146, 199, 140)';
const racquetBg = 'rgb(207, 198, 182)';
check(
  'bucket colors run/lift/racquet',
  barInfo.some((b) => b.bg === runBg) && barInfo.some((b) => b.bg === liftBg) && barInfo.some((b) => b.bg === racquetBg)
);
const restBars = barInfo.filter((b, i) => days[i].bucket === 'rest');
check(
  'rest days are 4px faint parchment',
  restBars.every((b) => b.h === '4px' && b.bg === 'rgba(237, 230, 218, 0.12)'),
  `${restBars.length} rest bars`
);
const active = barInfo.map((b, i) => ({ b, day: days[i] })).filter(({ day }) => day.bucket !== 'rest');
const heightsOk = active.every(({ b, day }) => b.h === `${Math.round(12 + 18 * (day.seconds / maxSeconds))}px`);
check('active heights 12–30px linear vs 90-day max', heightsOk);
check(
  'rise stagger — delay = index × 16ms',
  barInfo[0].delay === '0ms' && barInfo[10].delay === '160ms' && barInfo[89].delay === '1424ms',
  `${barInfo[0].delay} / ${barInfo[10].delay} / ${barInfo[89].delay}`
);
check('bars rose (as-rise fired via IO)', barInfo.every((b) => b.anim === 'as-rise'));
check(
  'legend + caption row',
  (await text(page2.locator('as-moving .strip-meta > span').first())) === 'run · lift · racquet — anything that moved counts' &&
    (await text(page2.locator('as-moving .strip-meta > span').last())) === 'last 90 days'
);
check(
  'legend keys are color-coded',
  (await page2.locator('.k-run').evaluate((el) => getComputedStyle(el).color)) === 'rgb(217, 165, 74)' &&
    (await page2.locator('.k-lift').evaluate((el) => getComputedStyle(el).color)) === 'rgb(146, 199, 140)' &&
    (await page2.locator('.k-racquet').evaluate((el) => getComputedStyle(el).color)) === 'rgb(207, 198, 182)'
);

const shot = process.env.SHOT_PATH;
if (shot) {
  await page2.waitForTimeout(1700); // let the rise sweep finish
  await page2.locator('as-moving').screenshot({ path: shot });
}
await page2.close();

const page2r = await browser.newPage({ viewport: { width: 1000, height: 1400 }, reducedMotion: 'reduce' });
await mockRoutes(page2r);
await page2r.goto(`${BASE}${PAGE}`, { waitUntil: 'domcontentloaded' });
await page2r.waitForSelector('as-moving:not([hidden])', { timeout: 10000 });
await page2r.waitForTimeout(300);
check('reduced motion: runner overlay hidden, base path kept', await page2r.locator('[data-route-runner]').isHidden());
check('reduced motion: base path still visible', await page2r.locator('[data-route-base]').isVisible());
check(
  'reduced motion: bars visible instantly (rise class, no IO wait)',
  await page2r.locator('[data-strip]').evaluate((el) => el.classList.contains('rise'))
);
check(
  'reduced motion: rhr dot has no inline beat',
  (await page2r.locator('[data-rhr-dot]').evaluate((el) => el.style.animation)) === ''
);
await page2r.close();

console.log('\npass 3 · home ticker moving item');
async function tickerShows(page, wantValue, timeoutMs = 25000) {
  const label = page.locator('[data-ticker-label]');
  const value = page.locator('[data-ticker-value]');
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if ((await text(label)) === 'moving' && (await text(value)) === wantValue) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

const runValue = `8.2km morning run around cubbon park, ${expectBucket(STRAVA_MOCK.latestAny.startedAt)}`;
const page3 = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page3.route('**/api/moving', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(STRAVA_MOCK) })
);
await page3.route('**/api/spotify', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ isPlaying: true, now: { title: 'One More Time', artist: 'Daft Punk', url: '', context: null }, last: null })
  })
);
await page3.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
check(`ticker cycles to 'moving · ${runValue}'`, await tickerShows(page3, runValue));
await page3.close();

const gymStart = new Date(Date.now() - 20 * 3600000).toISOString(); // ~yesterday-ish, inside 48h
const gymMock = {
  ...STRAVA_MOCK,
  latestAny: { name: 'Leg Day', sportType: 'strength_training', distanceKm: 0, startedAt: gymStart }
};
const gymValue = `leg day, ${expectBucket(gymStart)}`;
const page4 = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page4.route('**/api/moving', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(gymMock) })
);
await page4.route('**/api/spotify', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ isPlaying: true, now: { title: 'One More Time', artist: 'Daft Punk', url: '', context: null }, last: null })
  })
);
await page4.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
check(`ticker gym copy '${gymValue}' (name only, no km)`, await tickerShows(page4, gymValue));
await page4.close();

// the other feeds are stubbed dead as well, so fewer than 2 live items remain
// and the placeholder rotation keeps running — that is what this check reads.
const stale = {
  ...STRAVA_MOCK,
  latestAny: { ...STRAVA_MOCK.latestAny, startedAt: new Date(Date.now() - 72 * 3600000).toISOString() }
};
const page5 = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page5.route('**/api/moving', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(stale) })
);
await page5.route('**/api/spotify', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ disabled: true }) })
);
await page5.route('**/api/github', (route) => route.fulfill({ status: 500, body: 'nope' }));
await page5.route('**/api/mal', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ disabled: true }) })
);
await page5.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page5.waitForTimeout(4500); // > one rotation
const staleShown = await text(page5.locator('[data-ticker-label]'));
check(
  'stale (>48h) activity never becomes the moving item',
  staleShown !== 'moving',
  `label after a rotation: ${staleShown}`
);
await page5.close();

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
