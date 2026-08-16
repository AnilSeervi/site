// check-p5-home.mjs — gates /api/github so the SSR placeholder state can be measured first, then
// asserts the proof strip, hero spark, zero layout shift and the live ticker swap; writes a screenshot.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const SHOT =
  process.argv[2] ??
  '/private/tmp/claude-501/-Users-anil-Projects-anils-website/a4aa2ed4-8f26-4cd1-9d32-8cf1a7981e97/scratchpad/p5-home-live.png';

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const [github, spotify, mal] = await Promise.all(
  ['github', 'spotify', 'mal'].map((k) => fetch(`${BASE}/api/${k}`).then((r) => r.json()))
);

// mirror ticker.ts's item-building rules
const FRESH = 48 * 3600 * 1000;
const liveValues = [];
const track = spotify.now ?? spotify.last;
if (track?.title && track?.artist) liveValues.push(`${track.title} — ${track.artist}`);
const push = github.lastPush;
if (push?.repo && (push.ago === 'earlier today' || push.ago === 'yesterday')) {
  const short = String(push.repo).split('/').pop().toLowerCase();
  const n = Number(push.commits) || 0;
  liveValues.push(`${n} commit${n === 1 ? '' : 's'} to ${short}, ${push.ago}`);
}
const w = mal.watching;
if (w?.title && w.updatedAt && Date.now() - Date.parse(w.updatedAt) <= FRESH) {
  liveValues.push(
    `${w.title} — ${w.epTotal ? `episode ${w.ep} of ${w.epTotal}` : `episode ${w.ep}`}`
  );
}
const r = mal.reading;
if (r?.title) liveValues.push(r.title === 'Berserk' ? `${r.title} — the long haul` : r.title);
console.log('expected live ticker values:', JSON.stringify(liveValues));

const browser = await chromium.launch();
const page = await browser
  .newContext({ viewport: { width: 1400, height: 900 } })
  .then((c) => c.newPage());

let release;
const gate = new Promise((res) => (release = res));
await page.route('**/api/github', async (route) => {
  await gate;
  await route.continue();
});

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const cv = document.querySelector('as-spark[data-kind="hero"] canvas');
  if (!cv) return false;
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) return true;
  return false;
});
// typeon resizes the h1 while typing — wait it out so the geometry diff isolates the data fill.
await page.waitForFunction(
  () => document.querySelector('[data-typeon]')?.textContent === 'Anil Seervi',
  { timeout: 5000 }
);
await page.waitForTimeout(400);

const snap = () =>
  page.evaluate(() => {
    const box = (sel) => {
      const b = document.querySelector(sel)?.getBoundingClientRect();
      return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    };
    const txt = (k) => document.querySelector(`[data-proof=${k}]`)?.textContent ?? null;
    return {
      proofBox: box('.proof'),
      h1Box: box('h1'),
      stars: txt('stars'),
      repos: txt('repos'),
      followers: txt('followers'),
      shark: txt('shark'),
      pushed: txt('pushed'),
      pushedVisibility: getComputedStyle(
        document.querySelector('[data-proof=pushed]').parentElement
      ).visibility,
      heroPixels: document.querySelector('as-spark[data-kind="hero"] canvas').toDataURL(),
      heroValuesAttr: document
        .querySelector('as-spark[data-kind="hero"]')
        ?.getAttribute('data-values'),
      rowValueAttrs: [...document.querySelectorAll('as-spark[data-repo]')].map((el) => [
        el.dataset.repo,
        el.getAttribute('data-values') ? JSON.parse(el.getAttribute('data-values')).length : null
      ])
    };
  });

const before = await snap();
check(
  'before release: SSR placeholders intact',
  before.repos === '118' && before.heroValuesAttr === null,
  `repos="${before.repos}" heroValues=${before.heroValuesAttr}`
);

release();

// Gate on the hero spark's data-values, not on [data-proof=repos] matching the
// API: the SSR placeholder already equals repoCount whenever the count hasn't
// moved since the last deploy, so that condition is true before release and the
// wait returned instantly, snapshotting mid-update. #load sets data-values on
// every exit path, so it is the one signal that means "as-home-data finished".
await page.waitForFunction(
  () => document.querySelector('as-spark[data-kind="hero"]')?.hasAttribute('data-values'),
  null,
  { timeout: 10000 }
);
await page.waitForTimeout(1100); // the spark's 900ms reveal, so pixels have moved
const after = await snap();

check(
  'repos span equals /api/github repoCount',
  after.repos === String(github.repoCount),
  `"${before.repos}" -> "${after.repos}" (api ${github.repoCount})`
);
check(
  'stars span equals ★devfolioStars',
  after.stars === `★${github.devfolioStars}`,
  `"${before.stars}" -> "${after.stars}"`
);
check(
  'followers span equals api followers',
  after.followers === String(github.followers),
  `"${before.followers}" -> "${after.followers}"`
);
check('pull shark stays static', after.shark === before.shark, `"${after.shark}"`);
if (github.lastPush) {
  check(
    'pushed span shows live ago',
    after.pushed === `pushed ${github.lastPush.ago}` && after.pushedVisibility === 'visible',
    `"${after.pushed}" visibility=${after.pushedVisibility}`
  );
} else {
  check(
    'pushed chip hidden when lastPush null',
    after.pushedVisibility === 'hidden',
    `visibility: ${before.pushedVisibility} -> ${after.pushedVisibility}`
  );
}

check(
  'hero spark got data-values (52 weeks)',
  !!after.heroValuesAttr && JSON.parse(after.heroValuesAttr).length === 52,
  `len=${after.heroValuesAttr ? JSON.parse(after.heroValuesAttr).length : 'none'}`
);
check(
  'hero spark canvas pixels changed',
  after.heroPixels !== before.heroPixels,
  `dataURL ${before.heroPixels.length}ch -> ${after.heroPixels.length}ch, differ=${after.heroPixels !== before.heroPixels}`
);
const expectedRepos = Object.keys(github.sparks ?? {});
check(
  'row sparks got data-values for repos present in sparks',
  after.rowValueAttrs
    .filter(([repo]) => expectedRepos.includes(repo))
    .every(([, len]) => len === 52),
  JSON.stringify(after.rowValueAttrs)
);

const same = (a, b) => a && b && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.01);
check(
  'proof strip geometry unchanged',
  same(before.proofBox, after.proofBox),
  `${JSON.stringify(before.proofBox)} -> ${JSON.stringify(after.proofBox)}`
);
check(
  'h1 geometry unchanged',
  same(before.h1Box, after.h1Box),
  `${JSON.stringify(before.h1Box)} -> ${JSON.stringify(after.h1Box)}`
);

if (liveValues.length >= 2) {
  await page.waitForFunction(
    (vals) => vals.includes(document.querySelector('[data-ticker-value]')?.textContent),
    liveValues,
    { timeout: 12000 }
  );
  const tick = await page.evaluate(() => ({
    label: document.querySelector('[data-ticker-label]')?.textContent,
    value: document.querySelector('[data-ticker-value]')?.textContent
  }));
  check('ticker shows a live item', liveValues.includes(tick.value), JSON.stringify(tick));
  await page.waitForTimeout(3700);
  const tick2 = await page.evaluate(
    () => document.querySelector('[data-ticker-value]')?.textContent
  );
  check(
    'ticker keeps rotating within live set',
    liveValues.includes(tick2) && tick2 !== tick.value,
    JSON.stringify(tick2)
  );
} else if (liveValues.length === 1) {
  // ticker.ts activates on `items.length` >= 1 and only skips rotation below 2,
  // so a single live item is shown and sits there. The old assertion here
  // expected placeholders for anything under 2, which only holds at zero.
  await page
    .waitForFunction(
      (v) => document.querySelector('[data-ticker-value]')?.textContent === v,
      liveValues[0],
      { timeout: 12000 }
    )
    .catch(() => {});
  const val = await page.evaluate(() => document.querySelector('[data-ticker-value]')?.textContent);
  check(
    'single live item is shown and does not rotate',
    val === liveValues[0],
    `showing "${val}" (live set ${JSON.stringify(liveValues)})`
  );
} else {
  const val = await page.evaluate(() => document.querySelector('[data-ticker-value]')?.textContent);
  check(
    'no live items: placeholders kept',
    !liveValues.includes(val),
    `showing "${val}" (live set ${JSON.stringify(liveValues)})`
  );
}

await page.screenshot({ path: SHOT, fullPage: true });
console.log('screenshot:', SHOT);

await browser.close();
const failed = results.filter((x) => !x.ok);
console.log(failed.length ? `\n${failed.length} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failed.length ? 1 : 0);
