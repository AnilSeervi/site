// check-live.mjs — asserts /live rows against real feeds, a mocked now-playing, and mocked failures.
// Usage: node scripts/check-live.mjs [base-url]   (default http://localhost:4321)
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const text = async (loc) => (await loc.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

async function waitForFeeds(page) {
  const feeds = ['spotify', 'github', 'mal', 'weather'];
  await Promise.all(feeds.map((f) => page.waitForResponse(`**/api/${f}`, { timeout: 20000 })));
  await page.waitForTimeout(400); // let the fills apply
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });

const [spotify, github, mal, weather] = await Promise.all(
  ['spotify', 'github', 'mal', 'weather'].map((f) =>
    fetch(`${BASE}/api/${f}`).then((r) => r.json())
  )
);

console.log('\npass 1 · real data');
await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
await waitForFeeds(page);

check(
  'clock row',
  /^\d{2}:\d{2} ist · bengaluru$/.test(await text(page.locator('[data-row="clock"] as-clock')))
);
check(
  'coords row',
  (await text(page.locator('[data-row="coords"] .nval'))) === '12.97° N · 77.59° E'
);

if (weather.temp != null && weather.phrase) {
  const got = await text(page.locator('[data-live="weather"]'));
  check('weather row matches /api/weather', got === `${weather.temp}° · ${weather.phrase}`, got);
} else {
  check('weather row hidden (null feed)', await page.locator('[data-row="weather"]').isHidden());
}

if (mal.reading?.title) {
  const want = mal.reading.title + (mal.reading.title === 'Berserk' ? ' — the long haul' : '');
  const got = await text(page.locator('[data-live="reading"]'));
  check('reading row matches /api/mal reading', got === want, got);
  check(
    'reading title is the italic-serif em',
    (await text(page.locator('[data-live="reading"] em'))) === mal.reading.title
  );
} else {
  check('reading row hidden (null feed)', await page.locator('[data-row="reading"]').isHidden());
}

// Rendering "failed" as "quiet" prunes the section and hides a revoked refresh token.
if (spotify.error) {
  check(
    'upstream failed → section survives with an honest row',
    (await text(page.locator('[data-live="now"]'))) === "spotify didn't answer — try later" &&
      (await page.locator('[data-section="spotify"]').isVisible()),
    await text(page.locator('[data-live="now"]'))
  );
  const note = await text(page.locator('[data-live="phase-note"]'));
  check('head note says unavailable, not live', note === 'unavailable', note);
  check('last row hidden while degraded', await page.locator('[data-row="last"]').isHidden());
} else {
  if (spotify.now) {
    const want = `${spotify.now.title} — ${spotify.now.artist}${spotify.now.context ? ` · ${spotify.now.context}` : ''}`;
    const got = await text(page.locator('[data-live="now"]'));
    check('now row matches /api/spotify now', got === want, got);
  } else {
    check('now row hidden (nothing playing)', await page.locator('[data-row="now"]').isHidden());
  }
  if (spotify.last) {
    const got = await text(page.locator('[data-live="last"]'));
    check(
      'last played matches /api/spotify last',
      got === `${spotify.last.title} — ${spotify.last.artist}`,
      got
    );
  } else {
    check('last row hidden (null feed)', await page.locator('[data-row="last"]').isHidden());
  }
}
const playState = await page
  .locator('[data-eq] span')
  .first()
  .evaluate((el) => getComputedStyle(el).animationPlayState);
check(
  `eq bars ${spotify.isPlaying ? 'running' : 'paused'} (isPlaying=${spotify.isPlaying})`,
  playState === (spotify.isPlaying ? 'running' : 'paused'),
  `animation-play-state: ${playState}`
);

if (Array.isArray(github.days)) {
  const got = await text(page.locator('[data-live="contrib-total"]'));
  const want = `${github.total.toLocaleString('en-US')} contributions in the last year — brass runs hotter where the weeks did`;
  check('contrib total line matches /api/github', got === want, got);
  check('52 weeks meta', (await text(page.locator('.contrib-meta span').nth(1))) === '52 weeks');

  let hotCell = null;
  let coldCell = null;
  for (let w = 0; w < 52; w++)
    for (let d = 0; d < 7; d++) {
      if (github.days[w][d] > 0 && !hotCell) hotCell = [w, d];
      if (github.days[w][d] === 0 && !coldCell) coldCell = [w, d];
    }
  const px = await page.evaluate(
    ([hot, cold]) => {
      const cv = document.querySelector('as-contrib canvas');
      const x = cv.getContext('2d');
      const all = x.getImageData(0, 0, cv.width, cv.height).data;
      let brass = 0;
      for (let i = 0; i < all.length; i += 4) {
        if (
          all[i + 3] > 100 &&
          all[i] > 190 &&
          all[i + 1] > 130 &&
          all[i + 1] < 190 &&
          all[i + 2] < 110
        )
          brass++;
      }
      const probe = ([w, d]) => {
        const q = x.getImageData(
          Math.round((w * 13.5 + 5) * 2),
          Math.round((d * 13.5 + 5) * 2),
          1,
          1
        ).data;
        return [...q];
      };
      return { brass, hot: hot ? probe(hot) : null, cold: cold ? probe(cold) : null };
    },
    [hotCell, coldCell]
  );
  const nonzeroCells = github.days.flat().filter((c) => c > 0).length;
  // each 10×10 CSS cell ≈ 378 device px after the r2.5 corners
  const wantBrass = nonzeroCells * 378;
  check(
    'contrib canvas painted from REAL days (brass pixel count ~ nonzero cells)',
    px.brass > wantBrass * 0.7 && px.brass < wantBrass * 1.3,
    `${px.brass} brass px for ${nonzeroCells} nonzero cells (expected ≈${wantBrass})`
  );
  check(
    'hot cell probe is brass rgba(217,165,74,…)',
    px.hot &&
      Math.abs(px.hot[0] - 217) < 8 &&
      Math.abs(px.hot[1] - 165) < 8 &&
      Math.abs(px.hot[2] - 74) < 8 &&
      px.hot[3] > 100,
    String(px.hot)
  );
  check('cold cell probe is faint parchment', px.cold && px.cold[3] < 40, String(px.cold));
} else {
  check(
    'github section hidden (null feed)',
    await page.locator('[data-section="github"]').isHidden()
  );
}

if (mal.watching) {
  const tail =
    mal.watching.epTotal == null
      ? `episode ${mal.watching.ep}`
      : `episode ${mal.watching.ep} of ${mal.watching.epTotal}`;
  // Only the base title is in <em>; a season/part suffix stays outside it, lowercased.
  const split = mal.watching.title.match(
    /^(.*?)\s+((?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|part\s+\d+)\b.*)$/i
  );
  const base = split ? split[1] : mal.watching.title;
  const suffix = split ? ` ${split[2].toLowerCase()}` : '';
  const got = await text(page.locator('[data-live="watching"]'));
  check('anime row matches /api/mal watching', got === `${base}${suffix} — ${tail}`, got);
  check(
    'anime title is the italic-serif em, suffix outside it',
    (await text(page.locator('[data-live="watching"] em'))) === base
  );
} else {
  check('anime row hidden (null feed)', await page.locator('[data-row="watching"]').isHidden());
}
if (mal.manga) {
  const chapters =
    mal.manga.chTotal == null
      ? `chapter ${mal.manga.ch}`
      : `chapter ${mal.manga.ch} of ${mal.manga.chTotal}`;
  const want = `${mal.manga.title} — ${chapters}${mal.manga.vol ? `, vol ${mal.manga.vol}` : ''}`;
  const got = await text(page.locator('[data-live="manga"]'));
  check('manga row matches /api/mal manga', got === want, got);
} else {
  check('manga row hidden (null feed)', await page.locator('[data-row="manga"]').isHidden());
}
if (mal.shelf) {
  const got = await text(page.locator('[data-live="shelf"]'));
  const want = `${mal.shelf.anime.toLocaleString('en-US')} anime · ${mal.shelf.episodes.toLocaleString('en-US')} episodes · ${Math.round(mal.shelf.days * 10) / 10} days · mean ${mal.shelf.mean.toFixed(2)}`;
  check('shelf row matches /api/mal shelf', got === want, got);
  check(
    'mean is accent-colored',
    (await text(page.locator('[data-live="shelf"] .accent'))) === mal.shelf.mean.toFixed(2)
  );
} else {
  check('shelf row hidden (null feed)', await page.locator('[data-row="shelf"]').isHidden());
}

// Regex locators, not `text=MOVING`: that matches case-insensitively and hits "moving" in prose.
check('MOVING section absent', (await page.locator('text=/MOVING · GARMIN/').count()) === 0);
check('GUESTBOOK section absent', (await page.locator('text=/GUESTBOOK/').count()) === 0);
check(
  'globe placeholder 280×280 + caption',
  (await page.locator('.globe-ph').evaluate((el) => `${el.offsetWidth}×${el.offsetHeight}`)) ===
    '280×280' && (await text(page.locator('.globe-cap'))) === 'bengaluru — home'
);
check(
  'footer copy',
  (await text(page.locator('footer .left'))).endsWith(
    '/api/spotify · /api/github · /api/moving · /api/mal'
  ) && (await text(page.locator('footer a.chain'))) === 'next — ~/about →'
);

const shot = process.env.SHOT_PATH;
if (shot) await page.screenshot({ path: shot, fullPage: true });

console.log('\npass 2 · mocked now-playing');
const page2 = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page2.route('**/api/spotify', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      isPlaying: true,
      now: { title: 'One More Time', artist: 'Daft Punk', url: '', context: 'discovery weekly' },
      last: {
        title: 'Harder, Better, Faster, Stronger',
        artist: 'Daft Punk',
        url: '',
        playedAt: ''
      }
    })
  })
);
await page2.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
await waitForFeeds(page2);
check('now row visible', await page2.locator('[data-row="now"]').isVisible());
check(
  'now row text (title — artist · context)',
  (await text(page2.locator('[data-live="now"]'))) ===
    'One More Time — Daft Punk · discovery weekly'
);
check(
  'ctx suffix in its mono-faint span',
  (await text(page2.locator('[data-live="now"] .ctx'))) === 'discovery weekly'
);
check(
  'eq bars running while isPlaying',
  (await page2
    .locator('[data-eq] span')
    .first()
    .evaluate((el) => getComputedStyle(el).animationPlayState)) === 'running'
);
await page2.close();

console.log('\npass 3 · mocked failures / disabled feeds');
const page3 = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page3.route('**/api/spotify', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      isPlaying: false,
      now: null,
      last: { title: 'Icronic', artist: 'Polyphia', url: '', playedAt: '' }
    })
  })
);
await page3.route('**/api/mal', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ disabled: true }) })
);
await page3.route('**/api/github', (route) => route.fulfill({ status: 500, body: 'nope' }));
await page3.route('**/api/weather', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ temp: null, phrase: null })
  })
);
await page3.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
await waitForFeeds(page3);
check('weather row hidden', await page3.locator('[data-row="weather"]').isHidden());
check('reading row hidden', await page3.locator('[data-row="reading"]').isHidden());
check('github section hidden', await page3.locator('[data-section="github"]').isHidden());
check('mal section hidden entirely', await page3.locator('[data-section="mal"]').isHidden());
check('clock row still visible', await page3.locator('[data-row="clock"]').isVisible());
check('spotify section still alive', await page3.locator('[data-row="last"]').isVisible());
check('now row hidden when nothing playing', await page3.locator('[data-row="now"]').isHidden());
check(
  'eq bars paused while isPlaying=false',
  (await page3
    .locator('[data-eq] span')
    .first()
    .evaluate((el) => getComputedStyle(el).animationPlayState)) === 'paused'
);
await page3.close();

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
