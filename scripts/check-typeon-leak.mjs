// check-typeon-leak.mjs — navigates away mid-typing and back; asserts no stray typeon timers
// and no double-typing. Run: node scripts/check-typeon-leak.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

await page.addInitScript(() => {
  // ClientRouter navs keep the same document, so these timer patches survive page swaps.
  window.__timers = { timeouts: new Map(), intervals: new Map() };
  const oST = window.setTimeout.bind(window);
  const oSI = window.setInterval.bind(window);
  const oCT = window.clearTimeout.bind(window);
  const oCI = window.clearInterval.bind(window);
  window.setTimeout = (fn, ms, ...a) => {
    const id = oST(
      (...ia) => {
        window.__timers.timeouts.delete(id);
        if (typeof fn === 'function') fn(...ia);
      },
      ms,
      ...a
    );
    window.__timers.timeouts.set(id, { src: String(fn).slice(0, 120), ms });
    return id;
  };
  window.setInterval = (fn, ms, ...a) => {
    const id = oSI(fn, ms, ...a);
    window.__timers.intervals.set(id, { src: String(fn).slice(0, 120), ms });
    return id;
  };
  window.clearTimeout = (id) => {
    window.__timers.timeouts.delete(id);
    return oCT(id);
  };
  window.clearInterval = (id) => {
    window.__timers.intervals.delete(id);
    return oCI(id);
  };
  window.__typeonTimers = () => {
    const live = { timeouts: [], intervals: [] };
    for (const [id, v] of window.__timers.timeouts)
      if (/paint|typeon/i.test(v.src) || v.ms === 450) live.timeouts.push(v);
    for (const [id, v] of window.__timers.intervals)
      if (/paint|typeon/i.test(v.src) || v.ms === 75) live.intervals.push(v);
    return live;
  };
});

const out = {};

await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
// mid-typing window: the island types between 450ms and 1275ms after load
await page.waitForFunction(() => {
  const el = document.querySelector('[data-typeon]');
  return el && el.textContent.length >= 1 && el.textContent.length < 11;
});
out.midTypingText = await page.evaluate(
  () => document.querySelector('[data-typeon]').textContent
);
out.typeonTimersDuringTyping = await page.evaluate(() => window.__typeonTimers());

await Promise.all([
  page.waitForURL('**/work**'),
  page.click('header nav a[href="/work"], header nav a[href="/work/"]')
]);
await page.waitForTimeout(400);
out.sameDocumentAfterNav = await page.evaluate(() => !!window.__timers); // patches survived => VT swap
out.typeonTimersAfterLeaving = await page.evaluate(() => window.__typeonTimers());

await page.evaluate(() => {
  window.__tl = [];
  const iv = setInterval(() => {
    const el = document.querySelector('[data-typeon]');
    if (el) window.__tl.push(el.textContent);
    if (window.__tl.length > 140) clearInterval(iv);
  }, 20);
});
await Promise.all([
  page.waitForURL((u) => u.pathname === '/'),
  page.click('header .brand')
]);
await page.waitForTimeout(2600);

const tl = await page.evaluate(() => window.__tl);
let resets = 0;
let glitches = [];
for (let i = 1; i < tl.length; i++) {
  if (tl[i].length < tl[i - 1].length) {
    resets++;
    if (tl[i - 1] !== 'Anil Seervi' && tl[i - 1].length === 11) glitches.push([tl[i - 1], tl[i]]);
  }
  if (!'Anil Seervi'.startsWith(tl[i]) && tl[i] !== '') glitches.push(['bad-prefix', tl[i]]);
}
out.returnTimeline = {
  first: tl.slice(0, 3),
  last: tl.slice(-3),
  distinct: [...new Set(tl)],
  resets, // expected: exactly 1 (the island clearing the swapped-in SSR text)
  glitches
};
out.finalText = tl[tl.length - 1];
out.typeonTimersAfterCompletion = await page.evaluate(() => window.__typeonTimers());
out.allLiveIntervals = await page.evaluate(() =>
  [...window.__timers.intervals.values()].map((v) => ({ ms: v.ms, src: v.src.slice(0, 60) }))
);

console.log(JSON.stringify(out, null, 2));
await browser.close();
