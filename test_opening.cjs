const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    
    const page = await browser.newPage();
    
    console.log("Navigating to http://localhost:3847...");
    await page.goto("http://localhost:3847", { waitUntil: "networkidle2", timeout: 30000 });
    
    console.log("Waiting 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if #screen-opening has class "active"
    const screenOpeningActive = await page.evaluate(() => {
      const element = document.getElementById("screen-opening");
      if (!element) return { exists: false, hasActive: false };
      return { exists: true, hasActive: element.classList.contains("active") };
    });
    
    // Check if canvas #opening-scene-canvas exists
    const canvasExists = await page.evaluate(() => {
      const canvas = document.getElementById("opening-scene-canvas");
      return !!canvas;
    });
    
    // Take screenshot
    const screenshotPath = path.join(process.cwd(), "screenshot_opening_scene.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved to: " + screenshotPath);
    
    // Print findings
    console.log("\n===== FINDINGS =====");
    console.log("#screen-opening element exists: " + screenOpeningActive.exists);
    console.log("#screen-opening has active class: " + screenOpeningActive.hasActive);
    console.log("Canvas #opening-scene-canvas exists: " + canvasExists);
    console.log("Screenshot path: " + screenshotPath);
    console.log("====================\n");
    
    await browser.close();
  } catch (error) {
    console.error("Error:", error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
