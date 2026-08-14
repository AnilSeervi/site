// check-cal-drawer.mjs — /about career-calendar <as-drawer>: open, Esc/overlay/drag dismissal,
// focus return, scroll lock, aria, band layout. Usage: node scripts/check-cal-drawer.mjs [base-url]
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const state = (page) =>
  page.evaluate(() => {
    const dw = document.querySelector('as-drawer');
    const zd = document.querySelector('[data-cal-detail="zd"]');
    const card = document.querySelector('[data-cal="zd"]');
    return {
      hidden: dw?.hidden ?? null,
      open: dw?.hasAttribute('data-open') ?? null,
      zdShown: zd ? !zd.hidden : null,
      expanded: card?.getAttribute('aria-expanded') ?? null,
      scrollLocked: document.documentElement.style.overflow === 'hidden',
      focusInSheet: !!document.activeElement?.closest?.('[data-dw-sheet]')
    };
  });

const settle = (page) => page.waitForTimeout(650); // open 500ms / close 460ms

const browser = await chromium.launch();

console.log('\ndesktop');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const bands = await page.evaluate(() => {
    const rows = getComputedStyle(document.querySelector('.cal-grid')).gridAutoRows;
    const groups = [...document.querySelectorAll('.cal-mgroup')];
    const ms = [...document.querySelectorAll('.cal-milestone')].map((m) => m.textContent.trim());
    const cardText = [...document.querySelectorAll('.card-tick, .card-foot')].map((c) =>
      c.textContent.trim().toLowerCase()
    );
    return {
      rows,
      groups: groups.length,
      perBand: groups.map((g) => g.children.length),
      total: ms.length,
      echoes: ms.filter((m) =>
        cardText.some((c) => c.includes(m.toLowerCase()) || m.toLowerCase().includes(c))
      )
    };
  });
  check('year bands are minmax(92px, auto)', bands.rows === 'minmax(92px, auto)', bands.rows);
  check('every year carries a milestone', bands.groups === 7, `${bands.groups}/7`);
  check(
    'bands hold at most two — the list stays curated',
    Math.max(...bands.perBand) <= 2,
    bands.perBand.join('/')
  );
  check(
    'no milestone echoes a card tick or footer',
    bands.echoes.length === 0,
    bands.echoes.join(' | ')
  );

  await page.locator('[data-cal="zd"]').click();
  await settle(page);
  let s = await state(page);
  check(
    'click opens the drawer with the right detail',
    s.hidden === false && s.open === true && s.zdShown === true && s.expanded === 'true',
    JSON.stringify(s)
  );
  check('body scroll locked · focus in sheet', s.scrollLocked && s.focusInSheet);

  await page.keyboard.press('Escape');
  await settle(page);
  s = await state(page);
  const focusBack = await page.evaluate(
    () => document.activeElement === document.querySelector('[data-cal="zd"]')
  );
  check(
    'esc closes · unlocks · aria resets',
    s.hidden === true && s.expanded === 'false' && !s.scrollLocked,
    JSON.stringify(s)
  );
  check('focus returns to the trigger', focusBack);

  await page.locator('[data-cal="zd"]').click();
  await settle(page);
  await page.locator('[data-dw-close]').click();
  await settle(page);
  s = await state(page);
  check('close pill dismisses', s.hidden === true, JSON.stringify(s));

  await page.locator('[data-cal="zd"]').click();
  await settle(page);
  const shown = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('[data-cal-detail]')].find((d) => !d.hidden)?.dataset
          .calDetail ?? null
    );
  check('opens on zd', (await shown()) === 'zd');
  await page.locator('[data-cal-step="1"]').click();
  check('› steps to self', (await shown()) === 'self');
  await page.locator('[data-cal-step="1"]').click();
  check('› steps to oss', (await shown()) === 'oss');
  await page.locator('[data-cal-step="1"]').click();
  check('› wraps back to zd', (await shown()) === 'zd');
  await page.locator('[data-cal-step="-1"]').click();
  check('‹ wraps back to oss', (await shown()) === 'oss');
  s = await state(page);
  check('stepping never closes the sheet', s.hidden === false && s.open === true);
  const ariaOnStep = await page.evaluate(() =>
    document.querySelector('[data-cal="oss"]')?.getAttribute('aria-expanded')
  );
  check('aria-expanded follows the step', ariaOnStep === 'true', `${ariaOnStep}`);
  await page.keyboard.press('Escape');
  await settle(page);

  // Numerals and ticks are bottom-aligned in their band, so compare TEXT bottoms via Range:
  // box tops would only prove they share a band, not that they sit on one line.
  const drift = await page.evaluate(() => {
    const textBottom = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().bottom;
    };
    const yr = Object.fromEntries(
      [...document.querySelectorAll('.cal-year')].map((y) => [y.textContent.trim(), textBottom(y)])
    );
    return [...document.querySelectorAll('.card-tick')].map((t) => {
      const m = t.textContent.trim().match(/(\d\d)$/);
      return Math.round(Math.abs(textBottom(t) - yr[`20${m[1]}`]));
    });
  });
  check(
    'ticks sit on their year’s line',
    drift.every((d) => d <= 1),
    `drift ${drift.join(', ')}px`
  );

  const legend = await page.evaluate(() => {
    const y = document.querySelector('.cal-year');
    const cs = getComputedStyle(y);
    // Index the collection, not :last-child/:last-of-type — .cal-year is never the grid's
    // last child and :last-of-type is tag-based; both silently return null here.
    const years = document.querySelectorAll('.cal-year');
    const last = getComputedStyle(years[years.length - 1]);
    return {
      top: cs.borderTopWidth,
      bottom: cs.borderBottomWidth,
      closes: last.borderBottomColor
    };
  });
  check(
    'year rule sits below the band',
    legend.top === '0px' && legend.bottom === '1px',
    JSON.stringify(legend)
  );

  await page.locator('[data-cal="oss"]').click();
  await settle(page);
  await page.mouse.click(640, 80); // well above the sheet → overlay
  await settle(page);
  s = await state(page);
  check('overlay click closes', s.hidden === true);

  await page.locator('[data-cal="self"]').click();
  await settle(page);
  const sheet = await page.locator('[data-dw-sheet]').boundingBox();
  await page.mouse.move(640, sheet.y + 12);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(640, sheet.y + 12 + i * (sheet.height * 0.05));
  await page.mouse.up();
  await settle(page);
  s = await state(page);
  check('drag past threshold dismisses', s.hidden === true, JSON.stringify(s));

  await page.locator('[data-cal="self"]').click();
  await settle(page);
  const sh2 = await page.locator('[data-dw-sheet]').boundingBox();
  await page.mouse.move(640, sh2.y + 12);
  await page.mouse.down();
  await page.mouse.move(640, sh2.y + 40, { steps: 4 });
  await page.waitForTimeout(180); // let the flick velocity die before release
  await page.mouse.up();
  await page.waitForTimeout(500);
  s = await state(page);
  check(
    'small slow drag springs back open',
    s.hidden === false && s.open === true,
    JSON.stringify(s)
  );
  await page.keyboard.press('Escape');
  await page.close();
}

console.log('\nmobile (iPhone 13)');
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const mg = await page.locator('.cal-mgroup').first().isVisible();
  check('milestone bands stay hidden on mobile', mg === false);

  await page.locator('[data-cal="zd"]').tap();
  await settle(page);
  let s = await state(page);
  check('tap opens', s.hidden === false && s.zdShown === true, JSON.stringify(s));

  const sheet = await page.locator('[data-dw-sheet]').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const x = 195;
  const y0 = sheet.y + 14;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: y0 }]
  });
  for (let i = 1; i <= 7; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y0 + i * 40 }]
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
  s = await state(page);
  check('swipe down dismisses', s.hidden === true, JSON.stringify(s));
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
