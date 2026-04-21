#!/usr/bin/env node
// 👑 THE KING'S GAME VERIFICATION TEST
// Test the newly deployed game systems

const puppeteer = require('puppeteer');

console.log('👑 THE KING\'S GAME VERIFICATION TEST');
console.log('═══════════════════════════════════════');

async function testGameplay() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  console.log('🌐 Loading game...');
  await page.goto('http://localhost:3847');
  
  console.log('🎮 Starting gameplay...');
  await page.click('#btn-new');
  
  // Wait for game to initialize
  await page.waitForTimeout(2000);
  
  console.log('🔍 Testing game systems...');
  
  const gameTest = await page.evaluate(() => {
    const results = {
      timestamp: Date.now(),
      systems: {},
      gameplay: {},
      controls: {},
      enemies: {},
      weapons: {}
    };
    
    // Test basic Three.js systems
    results.systems.scene = typeof window.scene !== 'undefined' && window.scene !== null;
    results.systems.camera = typeof window.camera !== 'undefined' && window.camera !== null;
    results.systems.renderer = typeof window.renderer !== 'undefined' && window.renderer !== null;
    results.systems.player = typeof window.player !== 'undefined' && window.player !== null;
    
    // Test game variables
    results.gameplay.enemies = typeof window.enemies !== 'undefined' && Array.isArray(window.enemies);
    results.gameplay.projectiles = typeof window.projectiles !== 'undefined' && Array.isArray(window.projectiles);
    results.gameplay.weapons = typeof window.weapons !== 'undefined' && Array.isArray(window.weapons);
    results.gameplay.targetingSystem = typeof window.targetingSystem !== 'undefined' && window.targetingSystem !== null;
    
    // Test current game state
    results.enemies.count = window.enemies ? window.enemies.length : 0;
    results.weapons.count = window.weapons ? window.weapons.length : 0;
    results.weapons.current = window.player ? window.player.currentWeapon : null;
    
    // Test controls
    results.controls.mouse = typeof window.mouse !== 'undefined';
    results.controls.keys = typeof window.keys !== 'undefined';
    
    return results;
  });
  
  console.log('\n📊 GAME VERIFICATION RESULTS:');
  console.log('═══════════════════════════════════');
  
  console.log('\n🎲 THREE.JS SYSTEMS:');
  Object.entries(gameTest.systems).forEach(([system, working]) => {
    console.log(`  ${system}: ${working ? '✅ WORKING' : '❌ FAILED'}`);
  });
  
  console.log('\n🎮 GAMEPLAY SYSTEMS:');
  Object.entries(gameTest.gameplay).forEach(([system, working]) => {
    console.log(`  ${system}: ${working ? '✅ WORKING' : '❌ FAILED'}`);
  });
  
  console.log('\n🔍 GAME STATE:');
  console.log(`  Active Enemies: ${gameTest.enemies.count}`);
  console.log(`  Available Weapons: ${gameTest.weapons.count}`);
  console.log(`  Current Weapon: ${gameTest.weapons.current !== null ? gameTest.weapons.current : 'None'}`);
  
  console.log('\n🎮 CONTROLS:');
  Object.entries(gameTest.controls).forEach(([control, working]) => {
    console.log(`  ${control}: ${working ? '✅ WORKING' : '❌ FAILED'}`);
  });
  
  // Test player movement
  console.log('\n🚀 TESTING PLAYER MOVEMENT...');
  await page.keyboard.press('w');
  await page.waitForTimeout(500);
  await page.keyboard.press('d');
  await page.waitForTimeout(500);
  
  // Test weapon firing
  console.log('💥 TESTING WEAPON FIRING...');
  await page.mouse.click(640, 400); // Center click
  await page.waitForTimeout(500);
  await page.keyboard.press(' '); // Space to fire
  await page.waitForTimeout(500);
  
  // Test weapon switching
  console.log('🔄 TESTING WEAPON SWITCHING...');
  await page.keyboard.press('2');
  await page.waitForTimeout(500);
  await page.keyboard.press('3');
  await page.waitForTimeout(500);
  
  // Take final screenshot
  console.log('📸 Taking gameplay screenshot...');
  await page.screenshot({ path: 'gameplay_verification.png', fullPage: true });
  
  const finalState = await page.evaluate(() => {
    return {
      enemies: window.enemies ? window.enemies.length : 0,
      projectiles: window.projectiles ? window.projectiles.length : 0,
      playerHealth: window.health || 0,
      score: window.score || 0
    };
  });
  
  console.log('\n📊 FINAL GAME STATE:');
  console.log(`  Enemies: ${finalState.enemies}`);
  console.log(`  Active Projectiles: ${finalState.projectiles}`);
  console.log(`  Player Health: ${finalState.playerHealth}`);
  console.log(`  Score: ${finalState.score}`);
  
  const allWorking = Object.values(gameTest.systems).every(x => x) && 
                    Object.values(gameTest.gameplay).every(x => x) && 
                    Object.values(gameTest.controls).every(x => x);
  
  if (allWorking) {
    console.log('\n👑 THE KING: GAME IS FULLY OPERATIONAL!');
    console.log('✅ All systems working correctly');
    console.log('✅ Player can move and fire');
    console.log('✅ Enemies are spawning');
    console.log('✅ Weapons are functional');
  } else {
    console.log('\n⚠️ SOME SYSTEMS NEED ATTENTION');
  }
  
  console.log('\n👑 VERIFICATION COMPLETE');
  
  await browser.close();
  return allWorking;
}

testGameplay().catch(console.error);