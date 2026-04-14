const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const DIR = "d:/antiruscist/oldeden/gameplay_screenshots";
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox","--disable-gpu","--window-size=1280,900"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("console", m => console.log("[BROWSER]", m.text()));
  page.on("pageerror", e => console.error("[PAGE-ERROR]", e.message));

  let shotN = 0;
  async function snap(label) {
    shotN++;
    const f = path.join(DIR, shotN.toString().padStart(2,"0") + "_" + label + ".png");
    await page.screenshot({ path: f, fullPage: false });
    console.log("[SNAP " + shotN + "] " + label);
  }

  console.log("=== LOADING GAME ===");
  await page.goto("http://localhost:3847", { waitUntil: "networkidle0", timeout: 30000 });
  await snap("01_title_screen");

  // Click New Game
  console.log("=== CLICKING NEW GAME ===");
  await page.click("#btn-new");
  await new Promise(r => setTimeout(r, 2000));
  await snap("02_create_screen");

  // Select first faction
  console.log("=== SELECTING FACTION ===");
  const factionCards = await page.$$(".faction-card");
  if (factionCards.length > 0) { await factionCards[0].click(); }
  await new Promise(r => setTimeout(r, 1000));
  await snap("03_faction_selected");

  // Enter pilot name
  console.log("=== ENTERING NAME ===");
  const nameInput = await page.$("#pilot-name");
  if (nameInput) { await nameInput.type("TestPilot42"); }
  await snap("04_name_entered");

  // Click Create Pilot button
  console.log("=== CREATING PILOT ===");
  const createBtn = await page.$("#btn-create-pilot");
  if (createBtn) { await createBtn.click(); }
  else {
    const btns = await page.$$("button");
    for (const b of btns) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt.toLowerCase().includes("create")) { await b.click(); break; }
    }
  }
  await new Promise(r => setTimeout(r, 3000));
  await snap("05_after_create_3s");

  // Check what screen is active
  const activeScreen = await page.evaluate(() => {
    const screens = document.querySelectorAll("[id^=screen-]");
    const visible = [];
    screens.forEach(s => { if (s.style.display !== "none" && !s.hidden) visible.push(s.id); });
    return visible;
  });
  console.log("[INFO] Active screens:", activeScreen.join(", "));

  // Take gameplay screenshots every 10 seconds for 60 seconds
  console.log("=== GAMEPLAY PHASE (60s) ===");
  for (let i = 1; i <= 6; i++) {
    await new Promise(r => setTimeout(r, 10000));
    await snap("gameplay_" + (i * 10) + "s");
    // Check for JS errors and canvas state
    const canvasState = await page.evaluate(() => {
      const gc = document.getElementById("game-canvas");
      const hc = document.getElementById("hud-canvas");
      return {
        gameCanvas: gc ? { w: gc.width, h: gc.height, display: gc.style.display } : null,
        hudCanvas: hc ? { w: hc.width, h: hc.height, display: hc.style.display } : null,
        visibleScreens: Array.from(document.querySelectorAll("[id^=screen-]")).filter(s => s.style.display !== "none" && !s.hidden).map(s => s.id)
      };
    });
    console.log("[INFO " + (i*10) + "s] Canvas:", JSON.stringify(canvasState));
  }

  await snap("final_state_60s");

  // Get any console errors accumulated
  console.log("=== FINAL STATE ===");
  const finalInfo = await page.evaluate(() => {
    return {
      url: location.href,
      title: document.title,
      visibleScreens: Array.from(document.querySelectorAll("[id^=screen-]")).filter(s => s.style.display !== "none" && !s.hidden).map(s => s.id),
      webglOk: !!document.getElementById("game-canvas")?.getContext("webgl2")
    };
  });
  console.log("[FINAL]", JSON.stringify(finalInfo));
  console.log("[DONE] " + shotN + " screenshots in " + DIR);

  await browser.close();
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
