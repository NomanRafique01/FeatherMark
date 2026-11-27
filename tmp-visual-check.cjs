// Scratch visual check — delete after use.
// Samples the segmented pill's ::after transform during a real toggle click
// inside the actual Electron window, plus screenshots before/after.
const path = require('node:path');
const { _electron } = require('playwright-core');

const ROOT = __dirname;

(async () => {
  const app = await _electron.launch({
    executablePath: require(path.join(ROOT, 'node_modules/electron')),
    args: ['.'],
    cwd: ROOT,
  });
  const win = await app.firstWindow();
  await win.waitForSelector('.menu-segmented', { timeout: 15000 });
  await win.waitForTimeout(600);

  const shot = (name) => win.screenshot({ path: path.join(ROOT, 'tmp-shots', name) });
  await shot('01-initial.png');

  const samples = await win.evaluate(async () => {
    const pill = document.querySelector('.menu-segment-pill');
    const buttons = [...document.querySelectorAll('.menu-segment')];
    const target = buttons[3] || buttons[buttons.length - 1];
    const out = [];
    const readout = (t) => out.push({
      t: Math.round(t),
      after: getComputedStyle(pill, '::after').transform,
      pill: getComputedStyle(pill).transform,
      width: Math.round(pill.getBoundingClientRect().width),
      stretch: getComputedStyle(pill).getPropertyValue('--pill-stretch').trim(),
    });
    const start = performance.now();
    target.click();
    await new Promise((resolve) => {
      const step = () => {
        const elapsed = performance.now() - start;
        readout(elapsed);
        if (elapsed < 620) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    return out;
  });

  console.log('mode-toggle samples:', JSON.stringify(samples, null, 1));

  await win.waitForTimeout(400);
  await shot('02-after-mode-click.png');

  // Theme toggle: equal-width buttons, so stretch must come from travel distance
  const themeSamples = await win.evaluate(async () => {
    const pill = document.querySelector('.theme-segment-pill');
    const buttons = [...document.querySelectorAll('.theme-segment')];
    const out = [];
    const start = performance.now();
    buttons[2].click();
    await new Promise((resolve) => {
      const step = () => {
        const elapsed = performance.now() - start;
        out.push({
          t: Math.round(elapsed),
          stretch: getComputedStyle(pill).getPropertyValue('--pill-stretch').trim(),
          after: getComputedStyle(pill, '::after').transform,
        });
        if (elapsed < 620) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    return out;
  });
  console.log('theme-toggle samples:', JSON.stringify(themeSamples.filter((_, i) => i % 3 === 0), null, 1));

  await win.waitForTimeout(300);
  await shot('03-after-theme-click.png');

  const box = await win.evaluate(() => {
    const el = document.querySelector('.menu-segmented');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await win.screenshot({
    path: path.join(ROOT, 'tmp-shots', '04-mode-crop.png'),
    clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 },
  });

  await app.close();
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
