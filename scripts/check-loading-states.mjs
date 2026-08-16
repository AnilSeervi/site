// check-loading-states.mjs — intercepts /api/* with failures and empties, asserts degradation
// with no zeros and no faked values. Usage: node scripts/check-loading-states.mjs [base]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const txt = async (page, sel) =>
  (
    await page
      .locator(sel)
      .textContent()
      .catch(() => '')
  )
    ?.replace(/\s+/g, ' ')
    .trim() ?? '';

// Wait on the island's own settle signal — a fixed delay races a slow real feed on dev.
const liveArrived = (page) =>
  page.waitForSelector('as-live-data[data-load="arrived"]', { timeout: 15000 });
const movingSettled = (page) =>
  page.waitForFunction(
    () => {
      const m = document.querySelector('as-moving');
      return m && (m.hasAttribute('hidden') || m.dataset.load === 'arrived');
    },
    { timeout: 15000 }
  );

const browser = await chromium.launch();

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  await page.route('**/api/github', (r) => r.fulfill({ status: 500, body: 'boom' }));
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await liveArrived(page).catch(() => {});
  const total = await txt(page, '[data-live="contrib-total"]');
  check(
    'github error → caption "github is quiet — try later"',
    total === 'github is quiet — try later',
    total
  );
  check(
    'github error → dot-field placeholder stays (not .arrived)',
    !(await page.locator('[data-contrib]').evaluate((el) => el.classList.contains('arrived')))
  );
  check(
    'github error → section NOT hidden',
    await page.locator('[data-section="github"]').isVisible()
  );
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  await page.route('**/api/moving', (r) => r.fulfill({ status: 500, body: 'boom' }));
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await movingSettled(page).catch(() => {});
  check('moving error → whole MOVING block hidden', await page.locator('as-moving').isHidden());
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  await page.route('**/api/moving', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ latest: null, latestAny: null, month: null, days: [] })
    })
  );
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await movingSettled(page).catch(() => {});
  check(
    'moving empty days → whole MOVING block hidden',
    await page.locator('as-moving').isHidden()
  );
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  await page.route('**/api/spotify', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isPlaying: false,
        now: null,
        last: { title: 'Test Track', artist: 'Test Artist', url: '#', playedAt: '' }
      })
    })
  );
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await liveArrived(page).catch(() => {});
  check('spotify no now → now row hidden', await page.locator('[data-row="now"]').isHidden());
  const last = await txt(page, '[data-live="last"]');
  check(
    'spotify no now → last played shows',
    last.includes('Test Track') && last.includes('Test Artist'),
    last
  );
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  await page.route('**/api/mal', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ disabled: true })
    })
  );
  await page.goto(`${BASE}/live`, { waitUntil: 'domcontentloaded' });
  await liveArrived(page).catch(() => {});
  check(
    'mal disabled → MYANIMELIST section hidden',
    await page.locator('[data-section="mal"]').isHidden()
  );
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL OK' : failures + ' FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
