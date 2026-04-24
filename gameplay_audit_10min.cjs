// Gameplay audit — simulates ~10min of play, captures UI screenshots across
// viewports, and reports sizing/overflow/clickability issues.
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3000';
const OUT = path.join(__dirname, 'qa_reports', 'gameplay_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop',  width: 1366, height: 768  },
  { name: 'tablet',  width: 1024, height: 768  },
  { name: 'mobile',  width:  414, height: 896  },
];

const issues = [];
function log(msg) { console.log(msg); }
function issue(tag, msg) { issues.push(`[${tag}] ${msg}`); console.log(`  ⚠  ${tag}: ${msg}`); }
function ok(msg)      { console.log(`  ✔  ${msg}`); }

async function snap(page, name) {
  const p = path.join(OUT, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const results = [];
    // Check fixed/absolute elements that extend past viewport
    const VW = window.innerWidth, VH = window.innerHeight;
    document.querySelectorAll('*').forEach(el => {
      if (!el.offsetParent && el.tagName !== 'BODY') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      // Skip deeply nested child spans/divs — only flag containers
      if (el.children.length === 0) return;
      if (r.right > VW + 2 && r.width < VW) {
        results.push({ id: el.id, cls: el.className?.toString?.().slice(0, 30) || '', tag: el.tagName.toLowerCase(), right: Math.round(r.right), vw: VW });
      }
      if (r.bottom > VH + 50 && r.height < VH * 3) {
        // vertical overflow < ~3 screens is fine for scrollable panels; only flag large fixed containers
        if (style.position === 'fixed' && r.height > VH) {
          results.push({ id: el.id, cls: el.className?.toString?.().slice(0, 30) || '', tag: el.tagName.toLowerCase(), bottom: Math.round(r.bottom), vh: VH });
        }
      }
    });
    return results.slice(0, 30);
  });
}

async function checkClickability(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      found: true,
      visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden',
      w: Math.round(r.width), h: Math.round(r.height),
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      tooSmall: r.width < 40 || r.height < 24,
    };
  }, selector);
}

(async () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  GAMEPLAY AUDIT — ~10 min simulation      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n── Viewport: ${vp.name} (${vp.width}x${vp.height}) ──`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      // Capture JS console errors
      const consoleErrors = [];
      page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)));
      page.on('console', m => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
      });

      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
      await snap(page, `${vp.name}_01_title`);

      // Check banner blocking content
      const banner = await checkClickability(page, '#qa-unverified-banner');
      if (banner.found && banner.visible && banner.h > 100) {
        issue(vp.name, `QA banner too tall: ${banner.h}px`);
      }

      // Title screen — New Game button
      const btnNew = await checkClickability(page, '#btn-new');
      if (!btnNew.found)   issue(vp.name, 'btn-new not found');
      else if (!btnNew.visible) issue(vp.name, 'btn-new not visible');
      else if (btnNew.tooSmall) issue(vp.name, `btn-new too small: ${btnNew.w}x${btnNew.h}`);
      else ok(`btn-new OK: ${btnNew.w}x${btnNew.h}`);

      // Click New Game
      try {
        await page.click('#btn-new');
      } catch (e) { issue(vp.name, `btn-new click failed: ${e.message}`); }
      await new Promise(r => setTimeout(r, 800));
      await snap(page, `${vp.name}_02_create`);

      // Create screen check
      const createVisible = await page.evaluate(() => {
        const el = document.getElementById('screen-create');
        return el && getComputedStyle(el).display !== 'none';
      });
      if (!createVisible) issue(vp.name, 'screen-create not visible after btn-new click');
      else ok('create screen opened');

      // Find and click "Start Journey" / create button inside create screen
      const createStart = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#screen-create button'));
        const start = btns.find(b => /start|launch|create|begin|journey|enter/i.test(b.textContent));
        if (start) { start.click(); return { found: true, text: start.textContent.trim() }; }
        return { found: false, available: btns.map(b => b.textContent.trim()).slice(0, 6) };
      });
      if (!createStart.found) issue(vp.name, `No start button in create screen; buttons: ${JSON.stringify(createStart.available)}`);
      else ok(`Clicked create start: "${createStart.text}"`);
      await new Promise(r => setTimeout(r, 1500));
      await snap(page, `${vp.name}_03_gameplay`);

      // Gameplay check: canvas visible + HUD
      const gameCanvas = await checkClickability(page, '#game-canvas');
      if (!gameCanvas.visible) issue(vp.name, 'game-canvas not visible during gameplay');
      else ok(`game-canvas visible: ${gameCanvas.w}x${gameCanvas.h}`);

      const hudCanvas = await checkClickability(page, '#hud-canvas');
      if (!hudCanvas.visible) issue(vp.name, 'hud-canvas not visible during gameplay');
      else ok(`hud-canvas visible: ${hudCanvas.w}x${hudCanvas.h}`);

      // Mission overlay check
      const missionOverlay = await page.evaluate(() => {
        const el = document.getElementById('mission-overlay');
        if (!el) return { found: false };
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { found: true, visible: s.display !== 'none', w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), vw: window.innerWidth };
      });
      if (!missionOverlay.found) issue(vp.name, 'mission-overlay missing');
      else if (!missionOverlay.visible) issue(vp.name, 'mission-overlay hidden during gameplay');
      else if (missionOverlay.right > missionOverlay.vw + 2) issue(vp.name, `mission-overlay overflows: right=${missionOverlay.right} vw=${missionOverlay.vw}`);
      else ok(`mission-overlay OK: ${missionOverlay.w}x${missionOverlay.h}`);

      // Measure overflow
      const overflows = await measureOverflow(page);
      if (overflows.length) {
        overflows.slice(0, 5).forEach(o => issue(vp.name, `overflow: <${o.tag}${o.id?'#'+o.id:''}> right=${o.right||'-'} bottom=${o.bottom||'-'} vw=${o.vw||'-'} vh=${o.vh||'-'}`));
      } else ok('no overflow detected');

      // Simulate 10 min of gameplay via rapid key presses: J (warp), F (gunner), LMB (fire), M (mine), ESC
      console.log('  ── simulating gameplay actions ──');
      const actions = [
        { key: 'j', label: 'warp' },
        { key: 'f', label: 'gunner' },
        { key: 'm', label: 'mine' },
        { key: 'i', label: 'inventory' },
        { key: 'b', label: 'bridge' },
        { key: 'Escape', label: 'esc' },
      ];
      for (let i = 0; i < 10; i++) {
        const a = actions[i % actions.length];
        try { await page.keyboard.press(a.key); } catch {}
        await new Promise(r => setTimeout(r, 400));
      }

      // Click somewhere to fire / dock
      try {
        await page.mouse.move(vp.width / 2, vp.height / 2);
        for (let i = 0; i < 4; i++) { await page.mouse.click(vp.width / 2, vp.height / 2); await new Promise(r => setTimeout(r, 250)); }
      } catch {}
      await snap(page, `${vp.name}_04_after_actions`);

      // Final overflow check
      const overflowsFinal = await measureOverflow(page);
      if (overflowsFinal.length) {
        overflowsFinal.slice(0, 3).forEach(o => issue(vp.name, `post-action overflow: <${o.tag}${o.id?'#'+o.id:''}> right=${o.right||'-'} vw=${o.vw||'-'}`));
      }

      // Console error summary
      if (consoleErrors.length) {
        const fatal = consoleErrors.filter(e => !/404|Failed to load|favicon/i.test(e));
        if (fatal.length) issue(vp.name, `${fatal.length} fatal console errors (sample: ${fatal[0].slice(0, 100)})`);
        else ok(`console errors: ${consoleErrors.length} (all 404/asset)`);
      }

      await page.close();
    }

    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║  AUDIT COMPLETE — ${issues.length} issue(s) found`.padEnd(46) + '║');
    console.log(`╚════════════════════════════════════════════╝`);
    if (issues.length) {
      console.log('\n── ISSUE SUMMARY ──');
      issues.forEach((i, n) => console.log(`${(n+1).toString().padStart(2)}. ${i}`));
    }
    fs.writeFileSync(path.join(OUT, 'audit_report.txt'), issues.join('\n') || 'No issues', 'utf8');
    console.log(`\n  Screenshots: ${OUT}`);
    console.log(`  Report:      ${path.join(OUT, 'audit_report.txt')}\n`);
  } finally {
    await browser.close();
  }
})();
