/**
 * check-strip-readout.mjs — the MOVING strip's hover readout: line swap, bucket
 * colours, slot overflow, and the touch viewport.
 *
 * Usage: node scripts/check-strip-readout.mjs [base-url]
 */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const STRIP_BAR = 'as-moving[data-load="arrived"] [data-strip] span[data-day]';

// Bars mount at scaleY(0) and have no box to hover: trip the IntersectionObserver,
// then wait out the staggered rise (0.5s each + 16ms/bar).
async function armStrip(page) {
  await page.locator(STRIP_BAR).first().waitFor({ state: 'attached', timeout: 20000 });
  await page.locator('.strip-meta').scrollIntoViewIfNeeded();
  await page.locator('[data-strip].rise').waitFor({ timeout: 10000 });
  const n = await page.locator(STRIP_BAR).count();
  await page.waitForTimeout(500 + n * 16 + 150);
}

const readLine = (page) =>
  page.evaluate(() => {
    const legend = document.querySelector('[data-legend]');
    const out = document.querySelector('[data-readout]');
    const slot = document.querySelector('.meta-slot');
    return {
      legendHidden: legend?.hidden ?? null,
      readoutHidden: out?.hidden ?? null,
      text: (out?.textContent ?? '').trim(),
      buckets: [...(out?.querySelectorAll('[class^="k-"]') ?? [])].map((e) => ({
        word: e.textContent,
        color: getComputedStyle(e).color
      })),
      dimmed: [...(out?.querySelectorAll('.ro-dim') ?? [])].map(
        (e) => getComputedStyle(e).color
      ),
      clipped: (out?.scrollWidth ?? 0) > (slot?.clientWidth ?? 0)
    };
  });

const HEAD = /^(sun|mon|tue|wed|thu|fri|sat) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec) \d{1,2} — /;

// mocked payload — one of each shape the composer has to handle
const day = (date, extra) => ({ date, ...extra });
const MOCK_DAYS = [
  day('2026-07-20', { seconds: 0, bucket: 'rest' }),
  day('2026-07-21', {
    seconds: 4510,
    bucket: 'run',
    count: 3,
    parts: [{ bucket: 'run', seconds: 4510 }],
    names: ['bengaluru running'],
    km: 10.5,
    pace: '7:10'
  }),
  day('2026-07-22', {
    seconds: 3851,
    bucket: 'racquet',
    count: 2,
    parts: [
      { bucket: 'racquet', seconds: 2100 },
      { bucket: 'lift', seconds: 1751 }
    ],
    names: ['table tennis', 'strength']
  }),
  day('2026-07-23', {
    seconds: 2148,
    bucket: 'lift',
    count: 1,
    parts: [{ bucket: 'lift', seconds: 2148 }],
    names: ['strength']
  }),
  day('2026-07-24', {
    seconds: 6195,
    bucket: 'other',
    count: 1,
    parts: [{ bucket: 'other', seconds: 6195 }],
    names: ['bengaluru walking'],
    km: 7.2
  })
];

const MOCK_MOVING = {
  latest: null,
  latestAny: null,
  month: { runKm: 42, activeDays: 12, daysInMonth: 30 },
  days: MOCK_DAYS
};
const MOCK_FITNESS = { vo2max: 53, restingHr: 46, vo2maxRating: 'excellent', source: 'garmin' };

async function mock(page) {
  await page.route('**/api/moving', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_MOVING) })
  );
  await page.route('**/api/fitness', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_FITNESS) })
  );
}

const browser = await chromium.launch();

console.log('\npass 1 — live /api/moving');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await armStrip(page);
  const bars = page.locator(STRIP_BAR);
  const n = await bars.count();
  check('strip built', n === 90, `${n} bars`);

  const idle = await readLine(page);
  check('legend holds the line at rest', idle.legendHidden === false && idle.readoutHidden === true);

  const idleH = await page.locator('.strip-meta').evaluate((e) => e.getBoundingClientRect().height);

  let bad = 0;
  let clipped = 0;
  const samples = [];
  for (let i = 0; i < n; i++) {
    await bars.nth(i).hover();
    const s = await readLine(page);
    if (s.legendHidden !== true || !HEAD.test(s.text)) bad++;
    if (s.clipped) clipped++;
    if (i >= n - 3) samples.push(s.text);
  }
  check('every bar composes a day line', bad === 0, `${bad}/${n} malformed`);
  check('no line overflows the slot', clipped === 0, `${clipped}/${n} clipped`);
  console.log(`        last three: ${samples.map((s) => `“${s}”`).join('  ')}`);

  const hoverH = await page.locator('.strip-meta').evaluate((e) => e.getBoundingClientRect().height);
  check('swap does not reflow the line', idleH === hoverH, `${idleH}px → ${hoverH}px`);

  // the bucket words must not fall back to the inherited --faint (#5e5749)
  const withBuckets = await readLine(page);
  const faint = withBuckets.buckets.filter((b) => b.color === 'rgb(94, 87, 73)');
  check(
    'bucket words are coloured (:global reached them)',
    withBuckets.buckets.length > 0 && faint.length === 0,
    withBuckets.buckets.map((b) => `${b.word}=${b.color}`).join(' ')
  );

  await page.mouse.move(10, 10);
  const left = await readLine(page);
  check('leaving hands the line back', left.legendHidden === false && left.readoutHidden === true);
  await page.close();
}

console.log('\npass 2 — mocked shapes');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mock(page);
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await armStrip(page);
  const bars = page.locator(STRIP_BAR);
  check('mock strip length', (await bars.count()) === MOCK_DAYS.length);

  const want = [
    ['rest day', 'mon jul 20 — rest'],
    ['run day: km + pace, ×3 fold', 'tue jul 21 — run 1h15 · 10.5 km · 7:10/km — bengaluru running ×3'],
    ['two buckets, names in bucket order', 'wed jul 22 — racquet 35m · lift 29m — table tennis, strength'],
    ['indoor day: no distance', 'thu jul 23 — lift 36m — strength'],
    ['over an hour → 1h43', 'fri jul 24 — other 1h43 · 7.2 km — bengaluru walking']
  ];
  for (let i = 0; i < want.length; i++) {
    await bars.nth(i).hover();
    const s = await readLine(page);
    const got = s.text.replace(/\s+/g, ' ');
    check(want[i][0], got === want[i][1], got === want[i][1] ? got : `got “${got}”`);
  }

  await bars.nth(2).hover();
  const two = await readLine(page);
  check(
    'racquet + lift take their legend colours',
    two.buckets.length === 2 &&
      two.buckets[0].color === 'rgb(207, 198, 182)' &&
      two.buckets[1].color === 'rgb(146, 199, 140)',
    two.buckets.map((b) => `${b.word}=${b.color}`).join(' ')
  );
  check('name tail is dimmed', two.dimmed[0] === 'rgb(94, 87, 73)', two.dimmed.join(' '));

  const box = await bars.nth(2).boundingBox();
  await page.mouse.move(box.x + box.width + 1, box.y + box.height / 2);
  const gap = await readLine(page);
  check('a gap between bars keeps the day showing', gap.legendHidden === true, gap.text);
  await page.close();
}

console.log('\npass 3 — touch (no hover wiring)');
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await mock(page);
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await armStrip(page);
  const bars = page.locator(STRIP_BAR);

  await bars.nth(1).tap();
  const tapped = await readLine(page);
  check(
    'tapping a bar leaves the legend in place',
    tapped.legendHidden === false && tapped.readoutHidden === true,
    `legendHidden=${tapped.legendHidden} readoutHidden=${tapped.readoutHidden}`
  );
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
