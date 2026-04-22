const fs = require('fs');

console.log('🔧 TARGETED MOBILE & RESPONSIVE FIXES');

function safeReplace(content, oldStr, newStr, description) {
  if (!content.includes(oldStr)) {
    console.log(`❌ FAILED: ${description} - String not found`);
    console.log(`Looking for: ${oldStr.substring(0, 100)}...`);
    return content;
  }
  const newContent = content.replace(oldStr, newStr);
  console.log(`✅ ${description}`);
  return newContent;
}

function cr(str) {
  return str.split('\n').join('\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  
  // 1. FIX THE BROKEN MOBILE CONTROLS POINTER QUERY
  console.log('\\n1. FIXING MOBILE CONTROLS VISIBILITY');
  
  // Find and replace the exact pointer query that hides mobile controls
  const hideMobileQuery = `  @media (pointer: fine) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: none !important;
      pointer-events: none !important;
    }
  }`;
  
  const fixedMobileQuery = `  /* Mobile controls: Show on touch devices and when manually enabled */
  @media (pointer: coarse) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: block !important;
      pointer-events: auto !important;
    }
  }
  
  /* Show when manually enabled via toggle */
  body.mobile-enabled #mobile-controls,
  body.mobile-enabled #touch-move-zone,
  body.mobile-enabled #touch-stick,
  body.mobile-enabled #mobile-look-zone,
  body.mobile-enabled #touch-button-cluster,
  body.mobile-enabled #touch-button-row,
  body.mobile-enabled #touch-joystick-left,
  body.mobile-enabled #touch-fire,
  body.mobile-enabled #touch-reload,
  body.mobile-enabled #touch-boost,
  body.mobile-enabled #touch-gyro,
  body.mobile-enabled .touch-ui-element {
    display: block !important;
    pointer-events: auto !important;
  }`;
  
  html = safeReplace(html, hideMobileQuery, fixedMobileQuery, 'Fixed mobile controls visibility');
  
  // 2. ADD MOBILE TOGGLE BUTTON TO SETTINGS
  console.log('\\n2. ADDING MOBILE TOGGLE TO SETTINGS');
  
  const settingsHTML = `  <div class="btn-row"><button class="btn" id="btn-settings-back">&larr; Back</button></div>`;
  const settingsWithMobile = `  <div class="setting-row">
    <div class="setting-label">Mobile Controls</div>
    <button class="btn btn-sm" id="btn-mobile-toggle">Enable Touch Controls</button>
  </div>
  <div class="btn-row"><button class="btn" id="btn-settings-back">&larr; Back</button></div>`;
  
  html = safeReplace(html, settingsHTML, settingsWithMobile, 'Added mobile toggle to settings');
  
  // 3. ADD LANDSCAPE ORIENTATION STYLES
  console.log('\\n3. ADDING LANDSCAPE STYLES');
  
  const insertLandscapeAfter = `    body.touch-ui #lock-prompt { display:none !important; }
    #mobile-controls.active { display:block !important; }`;
  
  const landscapeStyles = cr(`
/* ── LANDSCAPE & MOBILE OPTIMIZATION ──── */
@media (orientation: landscape) and (max-height: 650px) {
  /* Compact UI in landscape */
  #hud-top, #hud-bottom { padding: 6px 10px; font-size: 0.9rem; }
  #touch-move-zone { width: 90px !important; height: 90px !important; }
  #mobile-look-zone { width: min(30vw, 120px) !important; }
  #screen-create { padding: 12px; }
}

@media (max-width: 900px) and (orientation: landscape) {
  /* Auto-show mobile controls in small landscape */
  body.mobile-auto #mobile-controls,
  body.mobile-auto #touch-move-zone,
  body.mobile-auto #touch-stick,
  body.mobile-auto #mobile-look-zone,
  body.mobile-auto #touch-button-cluster,
  body.mobile-auto #touch-button-row,
  body.mobile-auto #touch-joystick-left,
  body.mobile-auto #touch-fire,
  body.mobile-auto #touch-reload,
  body.mobile-auto #touch-boost,
  body.mobile-auto #touch-gyro,
  body.mobile-auto .touch-ui-element {
    display: block !important;
    pointer-events: auto !important;
  }
}`);
  
  html = safeReplace(html, insertLandscapeAfter, insertLandscapeAfter + landscapeStyles, 'Added landscape orientation styles');
  
  // 4. ADD DNA MENU CLOSE BUTTON
  console.log('\\n4. ADDING DNA MENU CLOSE BUTTON');
  
  const dnaMenuStart = `<div class="screen holo-screen" id="screen-create-holo" style="z-index:95;">`;
  const dnaMenuWithClose = `<div class="screen holo-screen" id="screen-create-holo" style="z-index:95;">
  <button class="close-btn" onclick="closeDNAMenu()" style="position:absolute;top:15px;right:20px;background:none;border:none;color:var(--text);font-size:24px;cursor:pointer;z-index:999;">✕</button>`;
  
  html = safeReplace(html, dnaMenuStart, dnaMenuWithClose, 'Added DNA menu close button');
  
  // 5. ADD MOBILE CONTROL JAVASCRIPT
  console.log('\\n5. ADDING MOBILE CONTROL JAVASCRIPT');
  
  const jsInsertPoint = `// Hide auto-play audio dialog when audio starts playing`;
  const mobileJS = cr(`
// Mobile controls functionality
let mobileControlsEnabled = false;

function closeDNAMenu() {
  const screen = document.getElementById('screen-create-holo');
  if (screen && screen.classList.contains('active')) {
    screen.classList.remove('active');
    showScreen('create');
    return true;
  }
  return false;
}

function toggleMobileControls() {
  mobileControlsEnabled = !mobileControlsEnabled;
  const body = document.body;
  
  if (mobileControlsEnabled) {
    body.classList.add('mobile-enabled');
  } else {
    body.classList.remove('mobile-enabled');
  }
  
  const btn = document.getElementById('btn-mobile-toggle');
  if (btn) {
    btn.textContent = mobileControlsEnabled ? 'Disable Touch Controls' : 'Enable Touch Controls';
  }
  
  localStorage.setItem('mobileControlsEnabled', mobileControlsEnabled.toString());
}

function autoDetectMobile() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmall = window.innerWidth <= 900;
  const isTouchDevice = 'ontouchstart' in window;
  
  if ((isLandscape && isSmall) || isTouchDevice) {
    document.body.classList.add('mobile-auto');
  } else {
    document.body.classList.remove('mobile-auto');
  }
}

// Initialize mobile controls
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('mobileControlsEnabled');
  if (saved === 'true') {
    mobileControlsEnabled = true;
    document.body.classList.add('mobile-enabled');
  }
  
  const btn = document.getElementById('btn-mobile-toggle');
  if (btn) {
    btn.addEventListener('click', toggleMobileControls);
    btn.textContent = mobileControlsEnabled ? 'Disable Touch Controls' : 'Enable Touch Controls';
  }
  
  autoDetectMobile();
  window.addEventListener('resize', autoDetectMobile);
  window.addEventListener('orientationchange', () => setTimeout(autoDetectMobile, 100));
});

`);
  
  html = safeReplace(html, jsInsertPoint, mobileJS + jsInsertPoint, 'Added mobile control JavaScript');
  
  // Write the fixed file
  fs.writeFileSync('public/index.html', html, 'utf8');
  
  console.log('\\n🎉 TARGETED MOBILE FIXES COMPLETE!');
  console.log('\\nFIXES APPLIED:');
  console.log('✅ Mobile controls now work on desktop via settings toggle');
  console.log('✅ Auto-detect mobile devices and landscape mode');
  console.log('✅ DNA menu now has close button (✕)');
  console.log('✅ Landscape orientation optimization');
  console.log('✅ Touch controls visible when needed');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}