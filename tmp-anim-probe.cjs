// Scratch animation probe — delete after use.
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
  await win.waitForSelector('.menu-segmented', { timeout: 20000 });
  await win.waitForTimeout(500);

  const initial = await win.evaluate(() => {
    const idx = (pillSel, btnSel) => {
      const buttons = [...document.querySelectorAll(btnSel)];
      return buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
    };
    return {
      mode: idx('.menu-segment-pill', '.menu-segment'),
      theme: idx('.theme-segment-pill', '.theme-segment'),
      format: idx('.editor-format-pill', '.editor-format-option'),
    };
  });
  console.log('INITIAL selection   :', JSON.stringify(initial));

  const probe = async (pillSel, btnSel, from, to) => win.evaluate(async ({ pillSel, btnSel, from, to }) => {
    const pill = document.querySelector(pillSel);
    const buttons = [...document.querySelectorAll(btnSel)];
    const rows = [];
    const before = getComputedStyle(pill).transform;
    const t0 = performance.now();
    buttons[to].click();
    await new Promise((done) => {
      const step = () => {
        const t = performance.now() - t0;
        const cs = getComputedStyle(pill);
        const after = getComputedStyle(pill, '::after');
        rows.push({
          t: Math.round(t),
          stretch: Number.parseFloat(cs.getPropertyValue('--pill-stretch')) || 1,
          tx: Number.parseFloat((after.transform.match(/matrix\(([-\d.]+)/) || [])[1] || 1),
          x: Math.round(Number.parseFloat((cs.transform.match(/matrix\(1, 0, 0, 1, ([-\d.]+)/) || [])[1] || 0)),
        });
        if (t < 700) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    const peak = rows.reduce((m, r) => Math.max(m, r.stretch), 1);
    const settledAt = rows.find((r) => Math.abs(r.stretch - 1) < 0.004);
    const arrivedAt = rows.find((r) => r.x === rows[rows.length - 1].x && rows.length > 2);
    return {
      from, to,
      startTransform: before,
      peakStretch: Number(peak.toFixed(3)),
      scaleXAt100ms: (rows.find((r) => r.t >= 100) || {}).tx,
      scaleXAt300ms: (rows.find((r) => r.t >= 300) || {}).tx,
      stretchSettledMs: settledAt ? settledAt.t : null,
      translateArrivedMs: arrivedAt ? arrivedAt.t : null,
      finalX: rows[rows.length - 1].x,
      finalStretch: rows[rows.length - 1].stretch,
      frames: rows.length,
    };
  }, { pillSel: pillSel, btnSel: btnSel, from, to });

  const mode = await probe('.menu-segment-pill', '.menu-segment', 0, 3);
  console.log('MODE  editor->focus :', JSON.stringify(mode));
  await win.waitForTimeout(400);
  const modeBack = await probe('.menu-segment-pill', '.menu-segment', 3, 1);
  console.log('MODE  focus->split  :', JSON.stringify(modeBack));
  await win.waitForTimeout(400);
  const theme = await probe('.theme-segment-pill', '.theme-segment', 0, 2);
  console.log('THEME equal-width   :', JSON.stringify(theme));
  await win.waitForTimeout(400);
  const present = await win.evaluate(() => ({
    mode: !!document.querySelector('.menu-segment-pill'),
    theme: !!document.querySelector('.theme-segment-pill'),
    format: !!document.querySelector('.editor-format-pill'),
  }));
  console.log('CONTROLS present    :', JSON.stringify(present));
  if (present.format) {
    const fmt = await probe('.editor-format-pill', '.editor-format-option', 0, 1);
    console.log('FORMAT plain->md    :', JSON.stringify(fmt));
  }

  // Put the dev instance back exactly as we found it
  await win.evaluate((initial) => {
    const pick = (btnSel, i) => {
      const buttons = [...document.querySelectorAll(btnSel)];
      if (i >= 0 && buttons[i]) buttons[i].click();
    };
    pick('.menu-segment', initial.mode);
    pick('.editor-format-option', initial.format);
    pick('.theme-segment', initial.theme);
  }, initial);
  await win.waitForTimeout(300);

  await app.close();
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
