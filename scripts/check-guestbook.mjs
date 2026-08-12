// check-guestbook.mjs — guestbook passes: signed out, GET failure, signed in via a forged session.
// Usage: node scripts/check-guestbook.mjs <session-token-file> [base-url] [path]  (jose-signed as-session JWT)
// Posts AND deletes real rows on the target base; the 3 original rows are asserted intact at the end.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const tokenFile = process.argv[2];
const BASE = process.argv[3] ?? 'http://localhost:4321';
const PAGE_PATH = process.argv[4] ?? '/live';
if (!tokenFile) {
  console.error('usage: node scripts/check-guestbook.mjs <session-token-file> [base-url] [path]');
  process.exit(1);
}
const token = readFileSync(tokenFile, 'utf8').trim();

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
const text = async (loc) => (await loc.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

const browser = await chromium.launch();

console.log('\npass 1 · signed out');
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForResponse('**/api/guestbook');
  await page.waitForTimeout(400);

  const auth = page.locator('[data-gb-auth]');
  check('meta is sign-in link', (await auth.getAttribute('href')) === '/api/auth/github');
  check('meta text', (await text(auth)) === 'sign with github →', await text(auth));
  check('say input hidden', await page.locator('[data-gb-say]').isHidden());
  const entries = page.locator('[data-gb-entries] .gb-entry');
  check('real entries replaced placeholders', (await entries.count()) === 3, String(await entries.count()));
  const first = await text(entries.first().locator('.gb-attr'));
  check('attribution format', /·\s+[a-z]{3} \d{4}$/.test(first), first);
  await page.close();
}

console.log('\npass 2 · fetch fails, placeholders kept');
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  await page.route('**/api/guestbook', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"entries":null}' })
  );
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const entries = page.locator('[data-gb-entries] .gb-entry');
  check('2 design quotes kept', (await entries.count()) === 2, String(await entries.count()));
  check(
    'first design quote',
    (await text(entries.first().locator('.gb-q'))).includes('Well done thaliya honni chahiye')
  );
  await page.close();
}

console.log('\npass 3 · signed in');
const created = [];
{
  const url = new URL(BASE);
  const context = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
  await context.addCookies([
    { name: 'as-session', value: token, domain: url.hostname, path: '/', httpOnly: true, sameSite: 'Lax' }
  ]);
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForResponse('**/api/auth/me');
  await page.waitForTimeout(400);

  const auth = page.locator('[data-gb-auth]');
  check('meta shows login', (await text(auth)) === 'signed in as gb-testuser', await text(auth));
  check('meta no longer a link', (await auth.getAttribute('href')) === null);
  check('say input visible', await page.locator('[data-gb-say] input').isVisible());

  const before = await page.locator('[data-gb-entries] .gb-entry').count();
  await page.fill('[data-gb-input]', 'playwright says hi');
  const postRes = page.waitForResponse(
    (r) => r.url().endsWith('/api/guestbook') && r.request().method() === 'POST'
  );
  await page.press('[data-gb-input]', 'Enter');
  const post = await (await postRes).json();
  created.push(post.entry?.id);
  await page.waitForTimeout(300);
  const rows = page.locator('[data-gb-entries] .gb-entry');
  check('text entry prepended', (await rows.count()) === before + 1, String(await rows.count()));
  check(
    'text entry content',
    (await text(rows.first().locator('.gb-q'))) === '“playwright says hi”',
    await text(rows.first().locator('.gb-q'))
  );
  check(
    'text entry attribution',
    (await text(rows.first().locator('.gb-attr'))).startsWith('gb test user ·'),
    await text(rows.first().locator('.gb-attr'))
  );
  check('input cleared after post', (await page.inputValue('[data-gb-input]')) === '');

  const canvas = page.locator('as-doodle canvas');
  const box = await canvas.boundingBox();
  check('canvas display size 320×140', box.width === 320 && box.height === 140, `${box.width}×${box.height}`);
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 90, { steps: 12 });
  await page.mouse.move(box.x + 260, box.y + 50, { steps: 8 });
  await page.mouse.up();
  const painted = await canvas.evaluate((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, 640, 280).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  });
  check('strokes painted on backing store', painted);

  const doodleRes = page.waitForResponse(
    (r) => r.url().endsWith('/api/guestbook') && r.request().method() === 'POST'
  );
  await page.click('[data-gb-ink]');
  const doodlePost = await (await doodleRes).json();
  created.push(doodlePost.entry?.id);
  await page.waitForTimeout(300);
  check('doodle entry prepended', (await rows.count()) === before + 2, String(await rows.count()));
  const img = rows.first().locator('img.gb-doodle');
  check('doodle renders as img', (await img.count()) === 1);
  check(
    'doodle img is png data URL',
    ((await img.getAttribute('src')) ?? '').startsWith('data:image/png;base64,')
  );
  check('canvas cleared after ink', !(await canvas.evaluate((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, 640, 280).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  })));

  let extraPost = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/guestbook') && r.method() === 'POST') extraPost = true;
  });
  await page.click('[data-gb-ink]');
  await page.waitForTimeout(400);
  check('empty pad ink does not POST', !extraPost);

  await context.close();
}

console.log('\ncleanup');
for (const id of created) {
  const r = await fetch(`${BASE}/api/guestbook`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Cookie: `as-session=${token}` },
    body: JSON.stringify({ id })
  });
  check(`deleted test row #${id}`, r.status === 200 && (await r.json()).ok === true);
}
const finalRes = await fetch(`${BASE}/api/guestbook`).then((r) => r.json());
check(
  '3 real rows remain',
  finalRes.entries?.length === 3 && finalRes.entries.every((e) => [1, 2, 3].includes(e.id)),
  JSON.stringify(finalRes.entries?.map((e) => e.id))
);

await browser.close();
console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
