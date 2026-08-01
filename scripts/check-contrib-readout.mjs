/**
 * check-contrib-readout.mjs — the SHIPPING · GITHUB grid's hover readout.
 *
 * The grid is canvas pixels, so there is nothing to hover: <as-contrib>
 * hit-tests pointer coordinates against the 13.5px stride / 10px cell and
 * reports a cell through `contrib:day`, and <as-live-data> renders it into the
 * meta line in the year total's place. What can quietly break:
 *   - the 3.5px gutter between cells must be a MISS, not a nearest-match;
 *   - a cell's date is derived from the `from` anchor, so an off-by-one there
 *     mislabels the entire year — the last real cell must land on today;
 *   - the current week is padded with zeros, and those future cells must not be
 *     described as quiet days;
 *   - mobile renders the last 23 weeks, but a cell must still report its index
 *     in the FULL grid or the "N that week" clause reads the wrong week;
 *   - superlatives are claimed only when the peak is unique.
 *
 * Pass 1 (live API): geometry + anchor against whatever the feed returns now.
 * Pass 2 (mocked): every line shape exactly, on a grid built to contain one of
 *   each — a unique peak day, a tied peak week, a 5-day streak, a quiet day.
 * Pass 3 (mobile): 23 rendered weeks still resolve full-grid week totals.
 *
 * Usage: node scripts/check-contrib-readout.mjs [base-url]
 */
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const PITCH = 13.5;
const CELL = 10;
const DAY_MS = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** centre of a rendered cell, in canvas-relative CSS pixels */
const centre = (week, day) => ({
  x: week * PITCH + CELL / 2,
  y: day * PITCH + CELL / 2
});

/** the meta line's state: which tenant holds it, and what it says */
const readLine = (page) =>
  page.evaluate(() => {
    const total = document.querySelector('[data-live="contrib-total"]');
    const out = document.querySelector('[data-contrib-readout]');
    return {
      totalHidden: total?.hidden ?? null,
      readoutHidden: out?.hidden ?? null,
      text: (out?.textContent ?? '').trim(),
      main: out?.querySelector('[data-part="main"]')?.textContent ?? '',
      ctx: out?.querySelector('[data-part="ctx"]')?.textContent ?? '',
      ctxColor: out?.querySelector('[data-part="ctx"]')
        ? getComputedStyle(out.querySelector('[data-part="ctx"]')).color
        : null,
      clipped: (out?.scrollWidth ?? 0) > (out?.clientWidth ?? 0)
    };
  });

/** hover a grid cell by its (week, day) in the RENDERED grid */
async function hoverCell(page, week, day, dx = 0, dy = 0) {
  const cv = page.locator('as-contrib canvas');
  const box = await cv.boundingBox();
  const p = centre(week, day);
  await page.mouse.move(box.x + p.x + dx, box.y + p.y + dy);
}

async function ready(page) {
  await page.locator('.contrib-wrap.arrived').waitFor({ timeout: 20000 });
  await page.locator('.contrib-meta').scrollIntoViewIfNeeded();
}

// ---------------------------------------------------------------------------
// mocked grid — 52×7, seeded so each line shape exists exactly once
// ---------------------------------------------------------------------------
const FROM = '2025-08-03'; // a Sunday
const MOCK_DAYS = Array.from({ length: 52 }, () => Array(7).fill(0));
const at = (w, d, v) => {
  MOCK_DAYS[w][d] = v;
};
// a unique peak day: 41, alone at the top
at(10, 3, 41);
// a 5-day streak in week 20 (mon–fri), none of them peaks
for (let d = 1; d <= 5; d++) at(20, d, 4);
// two weeks tied on 30 — "busiest week" must NOT be claimed for either
at(30, 2, 15);
at(30, 4, 15);
at(31, 1, 15);
at(31, 5, 15);
// a lone ordinary day, its week holding nothing else (no "N that week" clause)
at(40, 6, 7);
// a day whose week holds more, for the week clause
at(45, 1, 3);
at(45, 2, 6);
const MOCK_WEEKS = MOCK_DAYS.map((w) => w.reduce((a, b) => a + b, 0));
const MOCK_GITHUB = {
  total: MOCK_WEEKS.reduce((a, b) => a + b, 0),
  weeks: MOCK_WEEKS,
  days: MOCK_DAYS,
  from: FROM,
  followers: 120,
  repoCount: 40,
  stars: 500,
  devfolioStars: 486,
  lastPush: null,
  sparks: {}
};

const mock = (page) =>
  page.route('**/api/github', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_GITHUB) })
  );

// ---------------------------------------------------------------------------

const browser = await chromium.launch();

// ---- pass 1: live data ----------------------------------------------------
console.log('\npass 1 — live /api/github');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const feed = await page.evaluate(async () => {
    const r = await fetch('/api/github');
    return r.json();
  });
  const flat = feed.days.flat();
  check('feed carries the calendar anchor', Boolean(feed.from), `from=${feed.from}`);

  // the anchor is only right if the last non-future cell is today
  const anchor = Date.parse(`${feed.from}T00:00:00Z`);
  const today = iso(Date.now());
  let lastReal = -1;
  for (let i = 0; i < flat.length; i++) if (iso(anchor + i * DAY_MS) <= today) lastReal = i;
  check(
    'anchor lands the last real cell on today',
    iso(anchor + lastReal * DAY_MS) === today,
    `${iso(anchor + lastReal * DAY_MS)} vs ${today}`
  );

  const idle = await readLine(page);
  check('total holds the line at rest', idle.totalHidden === false && idle.readoutHidden === true);
  const idleH = await page.locator('.contrib-meta').evaluate((e) => e.getBoundingClientRect().height);

  // every cell in the rendered grid must resolve, and its date must match the
  // one the anchor predicts for that column/row
  let bad = 0;
  let mismatched = 0;
  let clipped = 0;
  for (let w = 0; w < 52; w++) {
    for (let d = 0; d < 7; d++) {
      const future = iso(anchor + (w * 7 + d) * DAY_MS) > today;
      await hoverCell(page, w, d);
      const s = await readLine(page);
      if (future) {
        // padded tail — the readout must stand down, not print a quiet day
        if (s.readoutHidden !== true) bad++;
        continue;
      }
      if (s.readoutHidden !== false) {
        bad++;
        continue;
      }
      if (!s.main.startsWith(shortOf(anchor, w, d))) mismatched++;
      if (s.clipped) clipped++;
    }
  }
  check('every real cell resolves (and the padded tail stays silent)', bad === 0, `${bad} wrong`);
  check('each cell reports the date its column implies', mismatched === 0, `${mismatched} off`);
  check('no line overflows its slot', clipped === 0, `${clipped} clipped`);

  // the 3.5px gutter is a miss, not a nearest-match
  await hoverCell(page, 5, 3);
  const onCell = await readLine(page);
  await hoverCell(page, 5, 3, CELL / 2 + 1.5, 0); // into the horizontal gutter
  const inGutter = await readLine(page);
  check(
    'gutter between columns reads as no cell',
    onCell.readoutHidden === false && inGutter.readoutHidden === true
  );
  await hoverCell(page, 5, 3, 0, CELL / 2 + 1.5); // vertical gutter
  const inGutterY = await readLine(page);
  check('gutter between rows reads as no cell', inGutterY.readoutHidden === true);

  const hoverH = await page.locator('.contrib-meta').evaluate((e) => e.getBoundingClientRect().height);
  check('swap does not reflow the line', idleH === hoverH, `${idleH}px → ${hoverH}px`);

  await page.mouse.move(5, 5);
  const left = await readLine(page);
  check('leaving hands the line back', left.totalHidden === false && left.readoutHidden === true);
  await page.close();
}

function shortOf(anchor, w, d) {
  const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const MO = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const at = new Date(anchor + (w * 7 + d) * DAY_MS);
  return `${WD[at.getUTCDay()]} ${MO[at.getUTCMonth()]} ${at.getUTCDate()}`;
}

// ---- pass 2: mocked line shapes ------------------------------------------
console.log('\npass 2 — mocked line shapes');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await mock(page);
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const want = [
    // [label, week, day, expected full line]
    ['unique peak day', 10, 3, 'wed oct 15 — 41 contributions — busiest day of the year'],
    ['mid-streak day', 20, 3, 'wed dec 24 — 4 contributions · 20 that week — day 3 of a 5-day streak'],
    ['first day of the streak', 20, 1, 'mon dec 22 — 4 contributions · 20 that week — day 1 of a 5-day streak'],
    ['tied peak week claims nothing', 30, 2, 'tue mar 3 — 15 contributions · 30 that week'],
    ['lone day, week holds nothing else', 40, 6, 'sat may 16 — 7 contributions'],
    ['week clause when the week holds more', 45, 1, 'mon jun 15 — 3 contributions · 9 that week'],
    ['quiet day', 5, 0, 'sun sep 7 — quiet']
  ];
  for (const [label, w, d, expect] of want) {
    await hoverCell(page, w, d);
    const s = await readLine(page);
    const got = s.text.replace(/\s+/g, ' ');
    check(label, got === expect, got === expect ? got : `got “${got}”`);
  }

  await hoverCell(page, 20, 3);
  const streak = await readLine(page);
  check('closing clause is dimmed', streak.ctxColor === 'rgb(94, 87, 73)', streak.ctxColor);
  await page.close();
}

// ---- pass 3: mobile renders a tail slice --------------------------------
console.log('\npass 3 — mobile (23 weeks rendered, full-grid indices)');
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await mock(page);
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const size = await page.locator('as-contrib canvas').evaluate((c) => ({
    css: c.style.width,
    backing: c.width
  }));
  check('mobile canvas is the 23-week box', size.css === '321px', JSON.stringify(size));

  // rendered column 0 is full-grid week 29 (52 - 23); week 45 is rendered 16.
  // If the island reported rendered indices, the week clause would read week 16.
  const cv = page.locator('as-contrib canvas');
  const box = await cv.boundingBox();
  const RENDERED = 23;
  const offset = MOCK_DAYS.length - RENDERED; // 29 — rendered col 0 is full week 29
  const p = centre(45 - offset, 1);
  await page.touchscreen.tap(box.x + p.x, box.y + p.y);
  await page.waitForTimeout(60);
  const s = await readLine(page);
  check(
    'a tapped cell resolves its FULL-grid week',
    s.text.includes('mon jun 15') && s.text.includes('9 that week'),
    s.text
  );
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
