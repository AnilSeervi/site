import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4321/live', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const el = await p.$('as-globe');

let found = -1;
for (let i = 0; i < 24; i++) {
  const buf = await el.screenshot();
  const brass = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    let cx = 0;
    for (let j = 0; j < d.length; j += 4) {
      if (d[j] > 170 && d[j + 1] > 120 && d[j + 1] < 190 && d[j + 2] < 110 && d[j] > d[j + 1] && d[j + 1] > d[j + 2]) {
        n++;
        cx += ((j / 4) % c.width) / c.width;
      }
    }
    return { n, centerX: n ? cx / n : 0 };
  }, buf.toString('base64'));
  // wait for the dot to be in the middle third — i.e. ON the visible face
  if (brass.n > 30 && brass.centerX > 0.33 && brass.centerX < 0.67) {
    found = i;
    await el.screenshot({
      path: '/private/tmp/claude-501/-Users-anil-Projects-anils-website/a4aa2ed4-8f26-4cd1-9d32-8cf1a7981e97/scratchpad/globe-marker.png'
    });
    break;
  }
  await p.waitForTimeout(1800);
}
console.log(found >= 0 ? `brass marker visible at sample ${found}` : 'NO marker across full rotation');
await b.close();
