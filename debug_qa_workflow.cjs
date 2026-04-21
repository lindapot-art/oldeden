#!/usr/bin/env node
// KING'S DIAGNOSTIC: QA Board Debugging Tool
// Simulates exact QA Board workflow to identify failure point

const puppeteer = require('puppeteer');
const path = require('path');

console.log('👑 THE KING\'S DIAGNOSTIC - QA Board Debug');
console.log('════════════════════════════════════════');

async function debugQAWorkflow() {
  const browser = await puppeteer.launch({ 
    headless: false,  // Visible for debugging
    devtools: true    // Open devtools
  });
  const page = await browser.newPage();
  
  console.log('🌐 Opening game page...');
  await page.goto('http://localhost:3847');
  
  console.log('📸 Initial screenshot...');
  await page.screenshot({ path: 'debug_initial.png' });
  
  console.log('🎮 Clicking New Game button...');
  await page.click('#btn-new');
  
  console.log('📸 Post-click screenshot...');
  await page.screenshot({ path: 'debug_post_click.png' });
  
  console.log('⏰ Waiting for createCharacterComplete event...');
  
  const gameplayLoaded = await page.evaluate(() => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('❌ TIMEOUT: No createCharacterComplete event received');
        resolve(false);
      }, 8000);
      
      window.addEventListener('createCharacterComplete', (evt) => {
        console.log('✅ createCharacterComplete event received:', evt.detail);
        clearTimeout(timeout);
        resolve(true);
      });
      
      // Fallback check
      setTimeout(() => {
        const activeScreen = [...document.querySelectorAll('.screen')].find(el => el.classList.contains('active'));
        console.log('🔍 Active screen check:', activeScreen?.id || 'none');
        if (activeScreen?.id === 'screen-bridge') {
          console.log('✅ Bridge screen is active (fallback success)');
          clearTimeout(timeout);
          resolve(true);
        }
      }, 500);
    });
  });
  
  console.log('📊 gameplayLoaded result:', gameplayLoaded);
  
  if (gameplayLoaded) {
    console.log('📸 Taking gameplay screenshot...');
    await page.screenshot({ path: 'debug_gameplay.png' });
    
    const overlayExists = await page.evaluate(() => {
      const mp = document.getElementById('mission-progress-overlay');
      const qo = document.getElementById('quest-overlay');
      console.log('🔍 mission-progress-overlay:', mp ? 'found' : 'NOT found');
      console.log('🔍 quest-overlay:', qo ? 'found' : 'NOT found');
      return !!(mp || qo);
    });
    
    console.log('📊 overlayExists result:', overlayExists);
  } else {
    console.log('❌ FAILED: Could not reach gameplay/overlay screen');
  }
  
  console.log('📸 Final screenshot...');
  await page.screenshot({ path: 'debug_final.png' });
  
  // Keep browser open for manual inspection
  console.log('🔍 Browser kept open for manual inspection...');
  console.log('Press Ctrl+C to close when done debugging.');
  
  // Don't close automatically
  await new Promise(() => {});
}

debugQAWorkflow().catch(console.error);