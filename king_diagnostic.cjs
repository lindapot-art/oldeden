#!/usr/bin/env node
// 👑 THE KING'S GAME STATE DIAGNOSTIC
// Comprehensive analysis of current game state and missing features

const puppeteer = require('puppeteer');

console.log('👑 THE KING\'S GAME STATE DIAGNOSTIC');
console.log('═══════════════════════════════════════');

async function assessGameState() {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  console.log('🌐 Loading game...');
  await page.goto('http://localhost:3847');
  
  console.log('📊 Analyzing current game state...');
  
  const gameState = await page.evaluate(() => {
    // Analyze what's actually working
    const analysis = {
      timestamp: Date.now(),
      screens: [],
      gameElements: {},
      threejs: {},
      controls: {},
      gameplaySystems: {},
      errors: []
    };
    
    // Check screens
    const screens = ['title', 'create', 'bridge', 'settings', 'rebirth', 'karma', 'eulogy', 'market'];
    screens.forEach(screen => {
      const el = document.getElementById(`screen-${screen}`);
      if (el) {
        analysis.screens.push({
          id: screen,
          exists: true,
          visible: el.style.display !== 'none',
          active: el.classList.contains('active')
        });
      }
    });
    
    // Check game elements
    const gameElements = ['game-canvas', 'hud-canvas', 'btn-new', 'btn-settings'];
    gameElements.forEach(id => {
      const el = document.getElementById(id);
      analysis.gameElements[id] = {
        exists: !!el,
        visible: el ? el.style.display !== 'none' : false,
        dimensions: el ? { width: el.width || el.clientWidth, height: el.height || el.clientHeight } : null
      };
    });
    
    // Check Three.js
    analysis.threejs = {
      sceneExists: typeof window.scene !== 'undefined' && window.scene !== null,
      rendererExists: typeof window.renderer !== 'undefined' && window.renderer !== null,
      cameraExists: typeof window.camera !== 'undefined' && window.camera !== null,
      playerExists: typeof window.player !== 'undefined' && window.player !== null,
      gameLoopRunning: typeof window.gameState !== 'undefined' && window.gameState.loopRunning
    };
    
    // Check controls
    analysis.controls = {
      mouseHandling: typeof window.mouse !== 'undefined',
      keyboardHandling: document.addEventListener ? true : false,
      gamepadSupport: typeof navigator.getGamepads === 'function'
    };
    
    // Check gameplay systems
    analysis.gameplaySystems = {
      enemies: {
        spawning: typeof window.enemies !== 'undefined' && Array.isArray(window.enemies),
        count: window.enemies ? window.enemies.length : 0
      },
      weapons: typeof window.weapons !== 'undefined',
      targeting: typeof window.targetingSystem !== 'undefined',
      physics: typeof window.physics !== 'undefined',
      particles: typeof window.particles !== 'undefined',
      audio: typeof window.audioSystem !== 'undefined'
    };
    
    // Check for errors
    const errorElements = document.querySelectorAll('.error, .warning, [id*="error"]');
    analysis.errors = Array.from(errorElements).map(el => ({
      type: el.className,
      text: el.textContent,
      visible: el.style.display !== 'none'
    }));
    
    return analysis;
  });
  
  console.log('\n📊 GAME STATE ANALYSIS RESULTS:');
  console.log('═══════════════════════════════════');
  
  console.log('\n🖥️ SCREENS:');
  gameState.screens.forEach(screen => {
    const status = screen.visible ? '👁️ VISIBLE' : screen.active ? '🔄 ACTIVE' : '❌ HIDDEN';
    console.log(`  ${screen.id}: ${status}`);
  });
  
  console.log('\n🎮 GAME ELEMENTS:');
  Object.entries(gameState.gameElements).forEach(([id, data]) => {
    const status = !data.exists ? '❌ MISSING' : data.visible ? '✅ VISIBLE' : '⚠️ HIDDEN';
    const dims = data.dimensions ? ` (${data.dimensions.width}x${data.dimensions.height})` : '';
    console.log(`  ${id}: ${status}${dims}`);
  });
  
  console.log('\n🎲 THREE.JS SYSTEMS:');
  Object.entries(gameState.threejs).forEach(([system, exists]) => {
    console.log(`  ${system}: ${exists ? '✅ ACTIVE' : '❌ MISSING'}`);
  });
  
  console.log('\n🎮 GAMEPLAY SYSTEMS:');
  console.log(`  Enemies: ${gameState.gameplaySystems.enemies.spawning ? '✅ SPAWNING' : '❌ NOT SPAWNING'} (${gameState.gameplaySystems.enemies.count} active)`);
  console.log(`  Weapons: ${gameState.gameplaySystems.weapons ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log(`  Targeting: ${gameState.gameplaySystems.targeting ? '✅ ACTIVE' : '❌ MISSING'}`);
  console.log(`  Physics: ${gameState.gameplaySystems.physics ? '✅ ACTIVE' : '❌ MISSING'}`);
  console.log(`  Particles: ${gameState.gameplaySystems.particles ? '✅ ACTIVE' : '❌ MISSING'}`);
  console.log(`  Audio: ${gameState.gameplaySystems.audio ? '✅ ACTIVE' : '❌ MISSING'}`);
  
  console.log('\n🚨 CRITICAL MISSING FEATURES:');
  const missing = [];
  if (!gameState.threejs.playerExists) missing.push('❌ Player object');
  if (!gameState.gameplaySystems.enemies.spawning) missing.push('❌ Enemy spawning system');
  if (!gameState.gameplaySystems.weapons) missing.push('❌ Weapon system');
  if (!gameState.gameplaySystems.targeting) missing.push('❌ Targeting system');
  if (!gameState.gameplaySystems.physics) missing.push('❌ Physics system');
  if (!gameState.gameplaySystems.particles) missing.push('❌ Particle effects');
  if (!gameState.gameplaySystems.audio) missing.push('❌ Audio system');
  
  missing.forEach(item => console.log(`  ${item}`));
  
  if (missing.length === 0) {
    console.log('  ✅ All critical systems appear to be present');
  } else {
    console.log(`\n👑 THE KING IDENTIFIES ${missing.length} CRITICAL MISSING FEATURES`);
  }
  
  console.log('\n📸 Taking diagnostic screenshot...');
  await page.screenshot({ path: 'diagnostic_screenshot.png', fullPage: true });
  
  console.log('\n👑 DIAGNOSTIC COMPLETE - PROCEEDING TO MASSIVE FEATURE DEPLOYMENT');
  
  await browser.close();
  return gameState;
}

assessGameState().catch(console.error);