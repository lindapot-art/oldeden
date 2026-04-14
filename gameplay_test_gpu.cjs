const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const DIR = "d:/antiruscist/oldeden/gameplay_screenshots";
if (fs.existsSync(DIR)) fs.readdirSync(DIR).forEach(f => fs.unlinkSync(path.join(DIR, f)));
else fs.mkdirSync(DIR, { recursive: true });

const URL = "http://localhost:3847";
const ERRORS = [];

(async () => {
  // Launch with GPU / SwiftShader WebGL enabled
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--use-gl=swiftshader",
      "--use-angle=swiftshader-webgl",
      "--enable-webgl",
      "--enable-webgl2-compute-context",
      "--enable-unsafe-swiftshader",
      "--window-size=1280,900",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Collect ALL console output and errors
  page.on("console", m => {
    const txt = m.text();
    console.log("[BROWSER " + m.type() + "] " + txt);
    if (m.type() === "error") ERRORS.push(txt);
  });
  page.on("pageerror", e => {
    console.error("[PAGE-ERROR] " + e.message);
    ERRORS.push("PAGE-ERROR: " + e.message);
  });

  let shotN = 0;
  async function snap(label) {
    shotN++;
    const f = path.join(DIR, shotN.toString().padStart(2, "0") + "_" + label + ".png");
    await page.screenshot({ path: f, fullPage: false });
    console.log("[SNAP " + shotN + "] " + label);
    return f;
  }

  // ── Phase 1: Load game ──
  console.log("\n=== PHASE 1: LOADING GAME ===");
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check WebGL status
  const webglStatus = await page.evaluate(() => {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return "NO WEBGL";
    return "WebGL OK: " + gl.getParameter(gl.RENDERER);
  });
  console.log("[WEBGL] " + webglStatus);
  await snap("title_screen");

  // ── Phase 2: Create character ──
  console.log("\n=== PHASE 2: CHARACTER CREATION ===");
  await page.click("#btn-new");
  await new Promise(r => setTimeout(r, 2000));
  await snap("create_screen");

  // Select first faction
  const factions = await page.$$(".faction-card");
  if (factions.length > 0) await factions[0].click();
  await new Promise(r => setTimeout(r, 500));

  // Enter name
  const nameInput = await page.$("#pilot-name");
  if (nameInput) await nameInput.type("TestPilot_GPU");
  await snap("faction_and_name");

  // Click Create Pilot
  const createBtn = await page.$("#btn-create-pilot");
  if (createBtn) {
    await createBtn.click();
  } else {
    // Fallback: find button by text
    const btns = await page.$$("button");
    for (const b of btns) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.toLowerCase().includes("create")) { await b.click(); break; }
    }
  }
  await new Promise(r => setTimeout(r, 3000));
  await snap("bridge_screen");

  // Show active screens
  const screens1 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[id^=screen-]"))
      .filter(s => {
        const st = getComputedStyle(s);
        return st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
      })
      .map(s => s.id);
  });
  console.log("[SCREENS] Visible after create:", screens1.join(", "));

  // ── Phase 3: Enter Space (the critical step) ──
  console.log("\n=== PHASE 3: ENTER SPACE ===");

  // Try clicking ENTER SPACE button
  const enterBtn = await page.$('button[onclick*="enterSpace"], #btn-enter-space, .enter-space-btn');
  if (enterBtn) {
    console.log("[INFO] Found enter space button by selector");
    await enterBtn.click();
  } else {
    // Find it by text content
    const allBtns = await page.$$("button");
    let found = false;
    for (const b of allBtns) {
      const txt = await page.evaluate(el => el.textContent.trim(), b);
      if (txt.includes("ENTER SPACE") || txt.includes("Enter Space")) {
        console.log("[INFO] Found ENTER SPACE button: " + txt);
        await b.click();
        found = true;
        break;
      }
    }
    if (!found) {
      // Maybe it's a div, not a button
      const enterDiv = await page.evaluate(() => {
        const els = document.querySelectorAll("*");
        for (const el of els) {
          if (el.textContent.trim().includes("ENTER SPACE") && el.onclick) return el.id || el.className;
        }
        return null;
      });
      console.log("[INFO] Enter space div: " + enterDiv);
      // Try keyboard approach - press Space or Enter
      console.log("[INFO] Trying keyboard: pressing Space key");
      await page.keyboard.press("Space");
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  await snap("after_enter_space_3s");

  // Check state after entering space
  const screens2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[id^=screen-]"))
      .filter(s => {
        const st = getComputedStyle(s);
        return st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
      })
      .map(s => s.id);
  });
  console.log("[SCREENS] Visible after ENTER SPACE:", screens2.join(", "));

  // Check canvas state
  const canvasInfo = await page.evaluate(() => {
    const gc = document.getElementById("game-canvas");
    const hc = document.getElementById("hud-canvas");
    return {
      game: gc ? { w: gc.width, h: gc.height, display: getComputedStyle(gc).display } : null,
      hud: hc ? { w: hc.width, h: hc.height, display: getComputedStyle(hc).display } : null,
    };
  });
  console.log("[CANVAS] " + JSON.stringify(canvasInfo));

  // ── Phase 4: Gameplay screenshots every 5 seconds ──
  console.log("\n=== PHASE 4: GAMEPLAY (5s intervals, 60s total) ===");
  for (let i = 1; i <= 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    await snap("gameplay_" + (i * 5) + "s");

    // Report runtime state every 15s
    if (i % 3 === 0) {
      const state = await page.evaluate(() => {
        const info = {};
        // Check for error banners
        const errBanner = document.querySelector(".error-banner, #error-banner, [class*=error]");
        if (errBanner) info.errorBanner = errBanner.textContent.substring(0, 200);
        // Check visible screens
        info.screens = Array.from(document.querySelectorAll("[id^=screen-]"))
          .filter(s => {
            const st = getComputedStyle(s);
            return st.display !== "none" && st.visibility !== "hidden";
          })
          .map(s => s.id);
        // Check if gameLoop is running  
        info.gameCanvas = document.getElementById("game-canvas")?.width;
        info.hudCanvas = document.getElementById("hud-canvas")?.width;
        // Check if renderer exists
        info.hasRenderer = !!window.renderer || !!window.state?.renderer;
        return info;
      });
      console.log("[STATE " + (i * 5) + "s] " + JSON.stringify(state));
    }
  }

  // ── Phase 5: Try Gunner mode ──
  console.log("\n=== PHASE 5: GUNNER MODE ===");
  const gunnerBtn = await page.evaluate(() => {
    const navItems = document.querySelectorAll(".nav-item, [data-screen], button");
    for (const el of navItems) {
      if (el.textContent.trim().toLowerCase().includes("gunner")) return el.id || el.className || "found-no-id";
    }
    return null;
  });
  console.log("[GUNNER] Button found: " + gunnerBtn);
  
  if (gunnerBtn) {
    await page.evaluate(() => {
      const navItems = document.querySelectorAll(".nav-item, [data-screen], button");
      for (const el of navItems) {
        if (el.textContent.trim().toLowerCase().includes("gunner")) { el.click(); break; }
      }
    });
    await new Promise(r => setTimeout(r, 3000));
    await snap("gunner_mode");

    // Take a few gunner screenshots
    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, 5000));
      await snap("gunner_" + (i * 5) + "s");
    }
  }

  // ── Final Report ──
  console.log("\n=== FINAL REPORT ===");
  await snap("final_state");
  
  console.log("[ERRORS TOTAL] " + ERRORS.length + " errors collected:");
  ERRORS.forEach((e, i) => console.log("  [" + (i + 1) + "] " + e.substring(0, 200)));
  
  console.log("[SCREENSHOTS] " + shotN + " total in " + DIR);
  console.log("[WEBGL] " + webglStatus);
  
  await browser.close();
  process.exit(ERRORS.some(e => e.includes("PAGE-ERROR")) ? 1 : 0);
})().catch(e => {
  console.error("[FATAL] " + e.message);
  process.exit(1);
});
