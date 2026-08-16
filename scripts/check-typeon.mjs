// check-typeon.mjs — <as-typeon> hero: timing curve (450ms delay, 75ms/char, 11 chars), em split,
// caret animation, reduced motion. Run: node scripts/check-typeon.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};

// ---------- Pass 1: normal motion, sample the h1 text timeline ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__samples = [];
    document.addEventListener('DOMContentLoaded', () => {
      const t0 = performance.now();
      window.__t0 = t0;
      const iv = setInterval(() => {
        const el = document.querySelector('[data-typeon]');
        if (!el) return;
        const em = el.querySelector('em');
        window.__samples.push({
          t: Math.round(performance.now() - t0),
          text: el.textContent,
          em: em ? em.textContent : null
        });
        if (performance.now() - t0 > 2600) clearInterval(iv);
      }, 20);
    });
  });
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  const samples = await page.evaluate(() => window.__samples);

  // first empty sample = the island cleared the SSR text; every timing is relative to it
  const clearIdx = samples.findIndex((s) => s.text === '');
  const tClear = clearIdx >= 0 ? samples[clearIdx].t : null;
  const at = (ms) => {
    let best = null;
    for (const s of samples) {
      if (best === null || Math.abs(s.t - (tClear + ms)) < Math.abs(best.t - (tClear + ms)))
        best = s;
    }
    return best;
  };
  const firstChar = samples.find((s) => clearIdx >= 0 && s.t > tClear && s.text.length >= 1);
  const complete = samples.find((s) => s.text === 'Anil Seervi');
  let monotonic = true;
  for (let i = clearIdx + 1; i < samples.length; i++) {
    if (samples[i].text.length < samples[i - 1].text.length) monotonic = false;
  }
  out.normal = {
    ssrTextAtFirstSample: samples[0]?.text,
    tClear,
    at300: at(300),
    at900: at(900),
    at1400: at(1400),
    firstCharAt: firstChar ? firstChar.t - tClear : null,
    completeAt: complete ? complete.t - tClear : null,
    finalText: samples[samples.length - 1]?.text,
    finalEm: samples[samples.length - 1]?.em,
    monotonic
  };

  out.caret = await page.evaluate(() => {
    const c = document.querySelector('as-typeon .caret, h1 .caret');
    if (!c) return { exists: false };
    const cs = getComputedStyle(c);
    let kf = false;
    for (const sh of document.styleSheets) {
      try {
        for (const r of sh.cssRules)
          if (r.type === CSSRule.KEYFRAMES_RULE && r.name === 'as-caret') kf = true;
      } catch (e) {}
    }
    return {
      exists: true,
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      animationTimingFunction: cs.animationTimingFunction,
      animationIterationCount: cs.animationIterationCount,
      keyframesDefined: kf,
      width: cs.width,
      height: cs.height,
      marginLeft: cs.marginLeft,
      verticalAlign: cs.verticalAlign
    };
  });
  const o1 = await page.evaluate(
    () => getComputedStyle(document.querySelector('h1 .caret')).opacity
  );
  const opacities = new Set([o1]);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(150);
    opacities.add(
      await page.evaluate(() => getComputedStyle(document.querySelector('h1 .caret')).opacity)
    );
  }
  out.caret.opacityValuesSeen = [...opacities];
  await ctx.close();
}

// ---------- Pass 2: prefers-reduced-motion ----------
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);
  const early = await page.evaluate(() => {
    const el = document.querySelector('[data-typeon]');
    return { text: el?.textContent, em: el?.querySelector('em')?.textContent };
  });
  await page.waitForTimeout(700);
  const later = await page.evaluate(() => document.querySelector('[data-typeon]')?.textContent);
  out.reducedMotion = { early, later };
  await ctx.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
