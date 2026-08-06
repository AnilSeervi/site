import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write']
});
const page = await ctx.newPage();
const out = {};

// 1. home stagger present + replays after nav round-trip
await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
out.staggerCount = await page.locator('.as-enter').count();
await page.click('nav a[href="/work"]');
await page.waitForURL('**/work');
await page.click('.brand');
await page.waitForTimeout(100);
out.staggerReplays = await page.evaluate(() =>
  [...document.querySelectorAll('.as-enter')].some(
    (el) => getComputedStyle(el).animationName === 'as-enter' && el.getAnimations().length > 0
  )
);

// 2. work: the why-line is inline on every spread (handoff 6b). It used to be
// one shared slot above the list that filled on hover — invisible on touch, and
// it shoved the list down up to 25px when it grew. Nothing to hover now.
await page.goto('http://localhost:4321/work', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
out.spreads = await page.locator('.spread').count();
out.whyLinesVisible = await page.locator('.spread .why:visible').count();
out.everyWhyStartsWithWhy = await page.$$eval('.spread .why', (els) =>
  els.length > 0 && els.every((e) => e.textContent.trim().startsWith('Why:'))
);
out.hoverSlotGone = (await page.locator('[data-why-slot], as-whyslot').count()) === 0;
out.archiveRows = await page.locator('.arow').count();

// 3. writing: search filter + preview slot + morph name present
await page.goto('http://localhost:4321/writing', { waitUntil: 'domcontentloaded' });
await page.keyboard.press('/');
out.searchFocused = await page.evaluate(() => document.activeElement?.tagName === 'INPUT');
await page.keyboard.type('event loop');
await page.waitForTimeout(150);
out.visibleRowsAfterFilter = await page.locator('[data-row]:visible').count();
out.hiddenGroups = await page.locator('[data-group][style*="display: none"]').count();
await page.keyboard.press('Escape');
await page.hover('[data-row]');
await page.waitForTimeout(120);
out.previewAfterHover = (await page.textContent('[data-preview]'))?.trim().slice(0, 40);

// 4. title morph: transition:name matches between row and article h1
const rowStyle = await page.evaluate(() => {
  const el = document.querySelector('[data-row] .title, [data-row] [style*="view-transition"]');
  return el ? getComputedStyle(el).viewTransitionName : null;
});
await page.click('[data-row]');
await page.waitForURL('**/writing/**');
await page.waitForTimeout(300);
const h1Style = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).viewTransitionName);
out.morph = { row: rowStyle, h1: h1Style, match: rowStyle === h1Style && !!rowStyle && rowStyle !== 'none' };

// 5. about: facts reveal + calendar panel
await page.goto('http://localhost:4321/about', { waitUntil: 'domcontentloaded' });
const blurBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.fact-value')).filter);
await page.click('.fact');
await page.waitForTimeout(500);
const blurAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.fact-value')).filter);
out.facts = { before: blurBefore.includes('blur'), after: blurAfter === 'none' };
// the calendar detail is a drawer now, not an inline toggle: the card only
// opens, and Esc / the close pill / the overlay / a drag dismiss it. Clicking
// the card a second time can't work — the overlay is over it.
await page.click('[data-cal="zd"]');
await page.waitForTimeout(650);
out.calOpen = await page.evaluate(
  () => !document.querySelector('[data-cal-detail="zd"]')?.hidden && !document.querySelector('as-drawer')?.hidden
);
await page.keyboard.press('Escape');
await page.waitForTimeout(650);
out.calClosed = await page.evaluate(() => document.querySelector('as-drawer')?.hidden === true);

// 6. palette: ⌘K, fuzzy, soft-nav via Enter
await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => ((window).__soft = true));
await page.keyboard.press('Meta+k');
out.palOpen = await page.evaluate(() => document.querySelector('as-palette')?.hasAttribute('data-open'));
await page.keyboard.type('event');
await page.waitForTimeout(150);
out.palFuzzyFirst = (await page.textContent('.pal-row.sel .pal-label'))?.trim().slice(0, 34);
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
out.palNav = page.url().includes('/writing/event-loop');
out.palSoftNav = await page.evaluate(() => (window).__soft === true);

// 7. accent cycle
await page.keyboard.press('Meta+k');
await page.keyboard.type('theme');
await page.waitForTimeout(120);
await page.keyboard.press('Enter');
await page.waitForTimeout(120);
out.accentAfterCycle = await page.evaluate(() =>
  document.documentElement.style.getPropertyValue('--as-accent')
);

console.log(JSON.stringify(out, null, 1));
await browser.close();
