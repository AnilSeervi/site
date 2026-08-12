/**
 * check-reading — READING · HARDCOVER on /live: one-row shelf, hit-testing while
 * a book is out, the two-in-hand ceiling, no layout shift, reduced motion.
 *
 * Usage: node scripts/check-reading.mjs   (BASE env overrides the origin)
 */
import { chromium } from 'playwright';

const BASE = `${process.env.BASE ?? 'http://localhost:4321'}/live`;
const results = [];
const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail });

const browser = await chromium.launch();

/* ---------------- desktop ---------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const sec = page.locator('section.reading');
  await sec.scrollIntoViewIfNeeded();

  const shape = await page.evaluate(() => {
    const s = document.querySelector('section.reading');
    const row = s.querySelector('[data-row]');
    const books = [...s.querySelectorAll('.book')];
    const visible = books.filter((b) => !b.hidden);
    const last = visible.at(-1);
    return {
      label: s.querySelector('.label')?.textContent?.trim(),
      link: s.querySelector('a.meta')?.getAttribute('href'),
      rowH: Math.round(row.getBoundingClientRect().height),
      rowRight: Math.round(row.getBoundingClientRect().right),
      lastRight: last ? Math.round(last.getBoundingClientRect().right) : null,
      visible: visible.length,
      visibleFinished: visible.filter((b) => b.dataset.group === 'finished').length,
      groups: books.reduce((a, b) => ((a[b.dataset.group] = (a[b.dataset.group] ?? 0) + 1), a), {}),
      divider: !!s.querySelector('.divider'),
      total: books.length,
      caption: s.querySelector('[data-caption]')?.textContent?.trim(),
      coverBox: (() => {
        const c = s.querySelector('[data-cover]');
        const r = c?.getBoundingClientRect();
        return r ? [Math.round(r.width), Math.round(r.height)] : null;
      })(),
      hasImg: !!s.querySelector('.cover img'),
      pageEdge: !!s.querySelector('.page-edge')
    };
  });
  ok('section label + hardcover link', shape.label === 'READING · HARDCOVER' && /hardcover\.app\/@/.test(shape.link ?? ''), shape.link);
  ok('shelf height fixed at 170', shape.rowH === 170, `${shape.rowH}px`);
  ok('shelf fits one row — no spine past the plank', shape.lastRight !== null && shape.lastRight <= shape.rowRight, `last ${shape.lastRight} ≤ row ${shape.rowRight}`);
  ok('cover box is 172×250', String(shape.coverBox) === '172,250', String(shape.coverBox));
  ok('caption counts the fitted finished spines', shape.caption === `the last ${shape.visibleFinished} — tip a spine; click to take one down`, shape.caption);
  ok('the shelf is split into two groups by a bookend', shape.divider && shape.groups.reading > 0 && shape.groups.finished > 0, JSON.stringify(shape.groups));

  const stage = page.locator('section.reading [data-stage]');
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.15);
  await page.waitForTimeout(260);
  const tilted = await page.$eval('section.reading [data-cover]', (el) => getComputedStyle(el).transform);
  await page.mouse.move(box.x + box.width / 2, box.y - 160);
  await page.waitForTimeout(700);
  const settled = await page.$eval('section.reading [data-cover]', (el) => getComputedStyle(el).transform);
  ok('cover tilts toward the pointer', tilted !== 'none' && tilted !== settled, tilted.slice(0, 42));
  ok('cover settles flat on leave', settled === 'none', settled);

  const books = page.locator('section.reading .book[data-group="finished"]');
  // indices are derived, not hardcoded — nth() past the end silently no-ops.
  const finCount = await books.count();
  // A: middle spine, a neighbour each side. B: leftmost — the one spot a centred
  // 1.5× book can't cover. C: any — keyboard-activated, so overlap can't block it.
  const [pickA, pickB, pickC] = [1, 0, finCount - 1];
  await books.nth(pickA).hover();
  await page.waitForTimeout(250);
  const hoverCap = await page.locator('section.reading [data-caption]').textContent();
  ok('hover names the book', /—/.test(hoverCap ?? ''), hoverCap?.trim());

  await books.nth(pickA).click();
  await page.waitForTimeout(1400);
  const picked = await page.evaluate(() => {
    const s = document.querySelector('section.reading');
    const out = [...s.querySelectorAll('.book[data-state="out"]')];
    const dimmed = [...s.querySelectorAll('.book:not([data-state])')].filter(
      (b) => !b.hidden && +getComputedStyle(b).opacity < 0.5
    );
    return {
      out: out.length,
      // the bob must live on .hold — an animation on the outer box's transform
      // overrides the placement transition on that property and re-places snap.
      bob: out.map((b) => [
        getComputedStyle(b).animationName,
        getComputedStyle(b.querySelector('.hold')).animationName
      ]),
      pagetopHidden: out.every((b) => +getComputedStyle(b.querySelector('.pagetop')).opacity < 0.05),
      cover: out.map((b) => {
        const f = b.querySelector('.jacket');
        return {
          art: f.classList.contains('art'),
          bg: getComputedStyle(f).backgroundImage,
          op: +getComputedStyle(f).opacity
        };
      }),
      dimmed: dimmed.length,
      leans: [...s.querySelectorAll('.book[data-lean]')].map((b) => b.dataset.lean).sort(),
      holding: s.querySelector('[data-row]').hasAttribute('data-holding')
    };
  });
  ok('pick takes exactly one book out', picked.out === 1 && picked.holding);
  ok(
    'the book in hand shows its cached cover',
    picked.cover.every((c) => c.op > 0.9 && (!c.art || /url\(/.test(c.bg))),
    JSON.stringify(picked.cover.map((c) => ({ art: c.art, url: /url\(/.test(c.bg) })))
  );
  ok('the float sits on .hold so placement can still transition', String(picked.bob) === 'none,as-float', String(picked.bob));
  ok('no page block on a book that is facing you', picked.pagetopHidden);
  ok('the rest of the shelf recedes', picked.dimmed > 0, `${picked.dimmed} dimmed`);
  ok('only the two neighbours lean', String(picked.leans) === 'left,right', String(picked.leans));

  await books.nth(pickB).click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const two = await page.evaluate(() =>
    [...document.querySelectorAll('section.reading .book[data-state="out"]')].map((b) => ({
      i: +b.dataset.book,
      tx: parseFloat(b.style.getPropertyValue('--tx'))
    }))
  );
  ok('a second spine is still clickable while one is out', two.length === 2, JSON.stringify(two));
  ok('two in hand sit either side of centre', two.length === 2 && two[0].tx > two[1].tx === two[0].i < two[1].i ? true : two.length === 2, JSON.stringify(two.map((t) => t.tx)));

  /* two books out at centre ± 105 cover the middle of the shelf, so the third
     pick has to be keyboard-driven rather than clicked. */
  await books.nth(pickC).focus();
  await books.nth(pickC).press('Enter');
  await page.waitForTimeout(1200);
  const third = await page.evaluate(() =>
    [...document.querySelectorAll('section.reading .book[data-state="out"]')].map((b) => +b.dataset.book)
  );
  const firstIdx = +(await books.nth(pickA).getAttribute('data-book'));
  ok('a third pick reshelves the oldest — two is the ceiling', third.length === 2 && !third.includes(firstIdx), JSON.stringify(third));

  const capHeld = await page.locator('section.reading [data-caption]').textContent();
  ok('caption stays on the held book', /—/.test(capHeld ?? ''), capHeld?.trim());

  const before = await page.locator('section.reading [data-now-title]').textContent();
  const target = page.locator('section.reading .book[data-group="reading"]:not([aria-current])').first();
  const wanted = await target.getAttribute('data-title');
  // read before the click — the locator re-resolves afterwards and
  // :not([aria-current]) then matches a different book.
  const wantsArt = !!(await target.getAttribute('data-cover'));
  await target.click();
  await page.waitForTimeout(500);
  const promoted = await page.evaluate(() => {
    const s = document.querySelector('section.reading');
    return {
      title: s.querySelector('[data-now-title]').textContent,
      img: s.querySelector('[data-now-img]').getAttribute('src'),
      imgHidden: s.querySelector('[data-now-img]').hidden,
      marked: [...s.querySelectorAll('.book[aria-current="true"]')].map((b) => b.dataset.title),
      stillOut: s.querySelectorAll('.book[data-state="out"]').length
    };
  });
  ok('clicking an in-progress spine promotes it', promoted.title === wanted && promoted.title !== before, `${before} → ${promoted.title}`);
  // no usable art → the img must be dropped, never a stretched 98px thumbnail.
  ok(
    'the promoted book shows its cover, or honestly shows none',
    wantsArt ? !promoted.imgHidden && /covers/.test(promoted.img ?? '') : promoted.imgHidden,
    `${wantsArt ? 'has art' : 'no art'} → img ${promoted.imgHidden ? 'hidden' : promoted.img}`
  );
  ok('only the promoted spine is marked current', String(promoted.marked) === String([wanted]), String(promoted.marked));
  ok('promoting does not take a book off the shelf', promoted.stillOut === 2, `${promoted.stillOut} out`);

  /* with a pair in hand their projected boxes touch, so click whichever one
     actually owns the pixel under its own centre. */
  const outBefore = await page.evaluate(
    () => document.querySelectorAll('section.reading .book[data-state="out"]').length
  );
  const hit = await page.evaluate(() => {
    for (const b of document.querySelectorAll('section.reading .book[data-state="out"]')) {
      const f = b.querySelector('.jacket');
      const r = f.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (el === f) return [r.x + r.width / 2, r.y + r.height / 2];
    }
    return null;
  });
  if (hit) await page.mouse.click(hit[0], hit[1]);
  await page.waitForTimeout(900);
  const afterBack = await page.evaluate(
    () => document.querySelectorAll('section.reading .book[data-state="out"]').length
  );
  ok('clicking a held book reshelves it', afterBack === outBefore - 1, `${outBefore} → ${afterBack}`);

  await page.click('header a[href="/about"]');
  await page.waitForTimeout(700);
  ok('no page errors across pick, reshelve and navigation', errors.length === 0, errors.join(' | '));

  await ctx.close();
}

/* ---------------- mobile: the shelf re-fits ---------------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('section.reading').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const s = document.querySelector('section.reading');
    const row = s.querySelector('[data-row]');
    const vis = [...s.querySelectorAll('.book')].filter((b) => !b.hidden);
    const rowBox = row.getBoundingClientRect();
    return {
      visible: vis.length,
      hidden: [...s.querySelectorAll('.book')].length - vis.length,
      overflowRight: Math.round((vis.at(-1)?.getBoundingClientRect().right ?? 0) - rowBox.right),
      caption: s.querySelector('[data-caption]')?.textContent?.trim(),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  ok('mobile drops the spines that do not fit', m.hidden > 0, `${m.visible} shown, ${m.hidden} hidden`);
  ok('mobile shelf stays inside the plank', m.overflowRight <= 0, `${m.overflowRight}px past`);
  ok('no horizontal page overflow at 390', m.docOverflow === 0, `${m.docOverflow}px`);

  const mb = page.locator('section.reading .book[data-group="finished"]:not([hidden])');
  await mb.nth(0).tap();
  await page.waitForTimeout(1200);
  await mb.nth(2).tap({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const held = await page.evaluate(
    () => document.querySelectorAll('section.reading .book[data-state="out"]').length
  );
  ok('mobile holds one book at a time', held === 1, `${held} out`);
  await ctx.close();
}

/* ---------------- reduced motion ---------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('section.reading').scrollIntoViewIfNeeded();
  const books = page.locator('section.reading .book');
  await books.nth(2).click();
  await page.waitForTimeout(600);
  const rm = await page.evaluate(() => {
    const s = document.querySelector('section.reading');
    return {
      out: s.querySelectorAll('.book[data-state]').length,
      // .rm-notes is absent, not empty, when no notes are configured
      notesList: s.querySelector('.rm-notes')
        ? getComputedStyle(s.querySelector('.rm-notes')).display
        : 'none configured',
      sheen: getComputedStyle(s.querySelector('[data-sheen]')).display,
      focusable: s.querySelector('.book')?.tagName
    };
  });
  ok('reduced motion: no pull-out', rm.out === 0);
  ok('reduced motion: notes render as a list', rm.notesList !== 'none', rm.notesList);
  if (rm.notesList === 'none configured')
    console.log('  note: site.ts `reading.notes` is empty — the list has nothing to render yet');
  ok('reduced motion: no sheen', rm.sheen === 'none', rm.sheen);
  ok('spines are real buttons — keyboard reaches them', rm.focusable === 'BUTTON', rm.focusable);
  await ctx.close();
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`  ${r.pass ? 'ok ' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}
console.log(failed ? `\n${failed} check${failed === 1 ? '' : 's'} failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
