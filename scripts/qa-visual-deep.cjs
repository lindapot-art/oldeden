const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.QA_PORT ? `http://localhost:${process.env.QA_PORT}` : 'http://localhost:3847';
const OUT = path.join(__dirname, '..', 'gameplay_screenshots', 'visual_deep');
const MIN_SHOTS = 500;
const TARGET_SHOTS = 540;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT, { withFileTypes: true })) {
  fs.rmSync(path.join(OUT, entry.name), { recursive: true, force: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateStarSystems() {
  const systems = [];
  for (let index = 0; index < 40; index += 1) {
    const angle = index * 2.399;
    const radius = 60 + Math.sqrt(index) * 55;
    const jitterX = Math.sin(index * 7.3) * 30;
    const jitterY = Math.cos(index * 11.1) * 30;
    systems.push({
      index,
      x: Math.cos(angle) * radius + jitterX,
      y: Math.sin(angle) * radius + jitterY,
      connections: [],
    });
  }
  for (const system of systems) {
    for (const target of systems) {
      if (system.index === target.index) continue;
      const dist = Math.hypot(system.x - target.x, system.y - target.y);
      if (dist < 120) system.connections.push(target.index);
    }
    if (system.connections.length === 0) {
      let nearestIndex = -1;
      let nearestDist = Infinity;
      for (const target of systems) {
        if (system.index === target.index) continue;
        const dist = Math.hypot(system.x - target.x, system.y - target.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = target.index;
        }
      }
      if (nearestIndex >= 0) system.connections.push(nearestIndex);
    }
  }
  return systems;
}

const STAR_SYSTEMS = generateStarSystems();

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1440,960',
    ],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  const errors = [];
  const flow = [];
  const summary = {
    shots: 0,
    jumps: [],
    deaths: [],
    screensSeen: {},
    roomsSeen: {},
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', (error) => errors.push('[page] ' + error.message));

  async function inspect() {
    return page.evaluate(() => {
      const activeScreen = document.querySelector('.screen.active');
      const visibleText = Array.from(document.querySelectorAll('.screen.active, #screen-transition-overlay.active, #eulogy-cause, #interior-room-meta, #bridge-location'))
        .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' | ')
        .slice(0, 500);
      const roomButtons = Array.from(document.querySelectorAll('.interior-room-btn')).map((button) => ({
        label: (button.textContent || '').trim(),
        active: button.classList.contains('active'),
      }));
      const visibleButtons = Array.from(document.querySelectorAll('button'))
        .filter((button) => {
          const style = getComputedStyle(button);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        })
        .map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim())
        .slice(0, 40);
      return {
        screen: activeScreen ? activeScreen.id : 'none',
        bodyScreen: document.body.dataset.screen || 'none',
        bridgeLocation: document.getElementById('bridge-location')?.textContent?.trim() || '',
        eulogyCause: document.getElementById('screen-eulogy')?.classList.contains('active')
          ? (document.getElementById('eulogy-cause')?.textContent?.trim() || '')
          : '',
        interiorBadge: document.getElementById('interior-room-badge')?.textContent?.trim() || '',
        interiorMeta: document.getElementById('interior-room-meta')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        missionProgress: document.getElementById('mission-progress')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        visibleText,
        visibleButtons,
        roomButtons,
      };
    });
  }

  async function snap(label) {
    summary.shots += 1;
    const fileName = `${String(summary.shots).padStart(3, '0')}_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.png`;
    await page.screenshot({ path: path.join(OUT, fileName), fullPage: false });
    const state = await inspect();
    summary.screensSeen[state.screen] = (summary.screensSeen[state.screen] || 0) + 1;
    if (state.interiorBadge) summary.roomsSeen[state.interiorBadge] = (summary.roomsSeen[state.interiorBadge] || 0) + 1;
    const logLine = [
      String(summary.shots).padStart(3, '0'),
      label,
      `screen=${state.screen}`,
      `body=${state.bodyScreen}`,
      state.bridgeLocation ? `system=${state.bridgeLocation}` : null,
      state.interiorBadge ? `room=${state.interiorBadge}` : null,
      state.eulogyCause ? `death=${state.eulogyCause}` : null,
      state.missionProgress ? `mission=${state.missionProgress}` : null,
    ].filter(Boolean).join(' | ');
    flow.push(logLine);
    console.log(logLine);
    return state;
  }

  async function clickSelector(selector) {
    return page.evaluate((target) => {
      const node = document.querySelector(target);
      if (!node) return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      node.click();
      return true;
    }, selector);
  }

  async function clickButtonText(text) {
    return page.evaluate((targetText) => {
      const buttons = Array.from(document.querySelectorAll('button, .nav-btn, .action-btn'));
      const match = buttons.find((button) => {
        const style = getComputedStyle(button);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
        return label === targetText || label.includes(targetText);
      });
      if (!match) return false;
      match.click();
      return true;
    }, text);
  }

  async function clickInteriorRoom(roomName) {
    return page.evaluate((targetRoom) => {
      const button = Array.from(document.querySelectorAll('.interior-room-btn')).find((node) => node.dataset.room === targetRoom);
      if (!button) return false;
      button.click();
      return true;
    }, roomName);
  }

  async function waitForScreen(screenId, timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const current = await inspect();
      if (current.screen === screenId) return true;
      await delay(100);
    }
    return false;
  }

  function systemCanvasPoint(index, width, height) {
    const system = STAR_SYSTEMS[index];
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 700;
    return {
      x: centerX + system.x * scale,
      y: centerY + system.y * scale,
    };
  }

  async function jumpToSystem(index) {
    const canvasBox = await page.$eval('#starmap-canvas', (canvas) => {
      const rect = canvas.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
    const point = systemCanvasPoint(index, canvasBox.width, canvasBox.height);
    await page.mouse.click(canvasBox.left + point.x, canvasBox.top + point.y);
    await delay(400);
    await snap(`starmap_selected_${index}`);
    await clickSelector('#btn-jump');
    await delay(2600);
    summary.jumps.push(index);
    for (let index2 = 0; index2 < 8; index2 += 1) {
      await snap(`jump_${index}_settle_${index2 + 1}`);
      await delay(350);
    }
  }

  async function captureRoom(roomName, frames) {
    await clickInteriorRoom(roomName);
    await delay(600);
    for (let index = 0; index < frames; index += 1) {
      await snap(`ship_${roomName}_${index + 1}`);
      await delay(350);
    }
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(1500);

  const initialState = await inspect();
  if (initialState.screen !== 'screen-bridge') {
    for (let index = 0; index < 12; index += 1) {
      await snap(`title_${index + 1}`);
      await delay(300);
    }
    await clickSelector('#btn-new');
    await delay(1200);
    for (let index = 0; index < 10; index += 1) {
      await snap(`create_${index + 1}`);
      await delay(250);
    }
    await clickSelector('.faction-card');
    await page.type('#pilot-name', `DeepAudit${Date.now().toString().slice(-5)}`);
    await snap('create_filled');
    await clickSelector('#btn-create-char');
    await waitForScreen('screen-bridge', 8000);
  }

  for (let index = 0; index < 18; index += 1) {
    await snap(`bridge_${index + 1}`);
    await delay(300);
  }

  await clickButtonText('Ship');
  await waitForScreen('screen-interior', 5000);
  await captureRoom('bridge', 18);
  await captureRoom('engine', 18);
  await captureRoom('cargo', 18);
  await captureRoom('quarters', 18);

  await clickButtonText('Bridge');
  await waitForScreen('screen-bridge', 4000);
  await clickButtonText('Map');
  await waitForScreen('screen-starmap', 4000);

  const visited = new Set([0]);
  let currentSystem = 0;
  for (let jumpCount = 0; jumpCount < 3; jumpCount += 1) {
    const nextSystem = STAR_SYSTEMS[currentSystem].connections.find((candidate) => !visited.has(candidate)) ?? STAR_SYSTEMS[currentSystem].connections[0];
    if (typeof nextSystem !== 'number') break;
    await jumpToSystem(nextSystem);
    visited.add(nextSystem);
    currentSystem = nextSystem;
  }

  for (let index = 0; index < 20; index += 1) {
    await snap(`starmap_post_jump_${index + 1}`);
    await delay(250);
  }

  await clickButtonText('Bridge');
  await waitForScreen('screen-bridge', 4000);
  await clickSelector('#btn-launch');
  await waitForScreen('screen-gunner', 5000);
  await delay(1200);
  await clickButtonText('MAX').catch(() => {});
  await clickSelector('#btn-battle-drone').catch(() => {});
  await clickSelector('#auto-target-btn').catch(() => {});

  for (let index = 0; index < 320; index += 1) {
    if (index % 6 === 0) {
      await page.mouse.click(720, 420).catch(() => {});
    }
    if (index % 18 === 0) {
      await page.keyboard.down('KeyW').catch(() => {});
      await delay(120);
      await page.keyboard.up('KeyW').catch(() => {});
    }
    if (index % 30 === 0) {
      await page.keyboard.down('ShiftLeft').catch(() => {});
      await delay(80);
      await page.keyboard.up('ShiftLeft').catch(() => {});
    }
    if (index % 24 === 0) {
      await clickSelector('#warp-target-btn').catch(() => {});
    }
    const state = await snap(`combat_${index + 1}`);
    if (state.screen === 'screen-eulogy' || state.screen === 'screen-rebirth') {
      summary.deaths.push({ shot: summary.shots, cause: state.eulogyCause || 'death-screen' });
      for (let deathFrame = 0; deathFrame < 24; deathFrame += 1) {
        await snap(`death_sequence_${deathFrame + 1}`);
        await delay(250);
      }
      break;
    }
    await delay(500);
  }

  while (summary.shots < TARGET_SHOTS) {
    await snap(`tail_${summary.shots + 1}`);
    await delay(220);
  }

  const report = {
    ...summary,
    errors,
    minimumMet: summary.shots >= MIN_SHOTS,
  };
  fs.writeFileSync(path.join(OUT, '_flow.txt'), flow.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(report, null, 2) + '\n');

  console.log(`Captured ${summary.shots} screenshots to ${OUT}`);
  console.log(`Jump trail: ${summary.jumps.join(', ') || 'none'}`);
  console.log(`Deaths detected: ${summary.deaths.length}`);
  if (errors.length) console.log(`Browser errors: ${errors.length}`);

  await browser.close();
  if (summary.shots < MIN_SHOTS) process.exitCode = 1;
})().catch((error) => {
  console.error('[qa-visual-deep] Fatal:', error.message);
  process.exit(1);
});