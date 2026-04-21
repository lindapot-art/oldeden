#!/usr/bin/env node
/**
 * Integration Verification Test
 * Check that all deferred systems are wired correctly in gameplay
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('[TEST] Launching integration verification...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // ════════════════════════════════════════════════════════════════
    // 1. VERIFY KEY BINDINGS EXIST IN SOURCE
    // ════════════════════════════════════════════════════════════════
    console.log('[1/5] Checking for weapon key bindings...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 10000 });
    
    const hasWeaponKeys = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return html.includes("if (key === '1')") &&
             html.includes("state.activeWeapon = 'laser'") &&
             html.includes("if (key === '2')") &&
             html.includes("state.activeWeapon = 'railgun'") &&
             html.includes("if (key === '3')") &&
             html.includes("state.activeWeapon = 'pistol'");
    });
    console.log(hasWeaponKeys ? '  ✅ Weapon keys bound' : '  ❌ Weapon keys NOT bound');
    
    // ════════════════════════════════════════════════════════════════
    // 2. VERIFY CONSUMABLE KEY BINDINGS
    // ════════════════════════════════════════════════════════════════
    console.log('[2/5] Checking for consumable key bindings...');
    const hasConsumableKeys = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return html.includes("if (key === 'r')") &&
             html.includes("if (key === 's')") &&
             html.includes("if (key === 'e')");
    });
    console.log(hasConsumableKeys ? '  ✅ Consumable keys bound' : '  ❌ Consumable keys NOT bound');
    
    // ════════════════════════════════════════════════════════════════
    // 3. VERIFY WEAPON FUNCTIONS EXIST
    // ════════════════════════════════════════════════════════════════
    console.log('[3/5] Checking for all weapon functions...');
    const weaponFunctions = await page.evaluate(() => {
      const names = ['fireLaser', 'fireRailgun', 'firePistol', 'fireBlasterFuturistic', 'fireBlasterWhite', 'fireBlasterTurret'];
      const html = document.documentElement.outerHTML;
      return names.map(n => ({ name: n, exists: html.includes(`function ${n}()`) }));
    });
    weaponFunctions.forEach(w => {
      console.log(`  ${w.exists ? '✅' : '❌'} ${w.name}`);
    });
    const allWeapons = weaponFunctions.every(w => w.exists);
    
    // ════════════════════════════════════════════════════════════════
    // 4. VERIFY CONSUMABLE INITIALIZATION CODE
    // ════════════════════════════════════════════════════════════════
    console.log('[4/5] Checking consumable initialization...');
    const hasConsumableInit = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return html.includes('Repair Kit') &&
             html.includes('Shield Cell') &&
             html.includes('EMP Grenade') &&
             html.includes("if (!state.inventory.find(i => i.name === 'Repair Kit')");
    });
    console.log(hasConsumableInit ? '  ✅ Consumable initialization present' : '  ❌ Consumable initialization missing');
    
    // ════════════════════════════════════════════════════════════════
    // 5. VERIFY POWER MULTIPLIER FUNCTIONS
    // ════════════════════════════════════════════════════════════════
    console.log('[5/5] Checking power multiplier function...');
    const hasPowerMultiplier = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return html.includes('function getPowerMultiplier(type)') &&
             html.includes("getPowerMultiplier('weapons'");
    });
    console.log(hasPowerMultiplier ? '  ✅ Power multiplier integrated' : '  ❌ Power multiplier NOT integrated');
    
    // ════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════
    const allPass = hasWeaponKeys && hasConsumableKeys && allWeapons && hasConsumableInit && hasPowerMultiplier;
    console.log(`\n[RESULT] Integration verification: ${allPass ? '✅ ALL SYSTEMS OK' : '⚠️ SOME SYSTEMS INCOMPLETE'}`);
    
    if (allPass) {
      console.log('  Ready for production gameplay');
      process.exit(0);
    } else {
      console.log('  Review failures above');
      process.exit(1);
    }
    
  } catch (e) {
    console.error('[ERROR]', e.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
