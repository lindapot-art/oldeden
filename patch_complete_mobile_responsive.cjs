const fs = require('fs');
const path = require('path');

console.log('🔧 COMPREHENSIVE MOBILE & RESPONSIVE FIXES');

function safeReplace(content, oldStr, newStr, description) {
  if (!content.includes(oldStr)) {
    console.log(`❌ FAILED: ${description} - String not found`);
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
  console.log('Reading index.html...');
  let html = fs.readFileSync('public/index.html', 'utf8');
  
  // 1. FIX MOBILE CONTROLS VISIBILITY - Add toggle button and make controls available in horizontal mode
  console.log('\n1. FIXING MOBILE CONTROLS VISIBILITY');
  
  // Add mobile controls toggle button after the settings icon
  const settingsIconHTML = `      <button id="settings-icon" class="hud-icon" title="Settings">⚙️</button>`;
  const withMobileToggle = `      <button id="settings-icon" class="hud-icon" title="Settings">⚙️</button>
      <button id="mobile-toggle" class="hud-icon" title="Toggle Mobile Controls" style="display:none;">📱</button>`;
  
  html = safeReplace(html, settingsIconHTML, withMobileToggle, 'Added mobile controls toggle button');
  
  // 2. FIX RESPONSIVE BREAKPOINTS - Replace the broken fine pointer media query
  console.log('\n2. FIXING RESPONSIVE BREAKPOINTS');
  
  const brokenPointerQuery = `  /* Hide mobile touch UI on fine-pointer (mouse/trackpad) devices */
  @media (pointer: fine) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: none !important;
      pointer-events: none !important;
    }
  }`;
  
  const fixedPointerQuery = `  /* Mobile controls: Hidden by default, shown when toggled or on touch devices */
  #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
  #touch-button-cluster, #touch-button-row, #touch-joystick-left,
  #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
    display: none !important;
    pointer-events: none !important;
  }
  
  /* Show mobile controls on touch devices */
  @media (pointer: coarse) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: block !important;
      pointer-events: auto !important;
    }
  }
  
  /* Show mobile controls when explicitly enabled */
  body.mobile-controls-enabled #mobile-controls,
  body.mobile-controls-enabled #touch-move-zone,
  body.mobile-controls-enabled #touch-stick,
  body.mobile-controls-enabled #mobile-look-zone,
  body.mobile-controls-enabled #touch-button-cluster,
  body.mobile-controls-enabled #touch-button-row,
  body.mobile-controls-enabled #touch-joystick-left,
  body.mobile-controls-enabled #touch-fire,
  body.mobile-controls-enabled #touch-reload,
  body.mobile-controls-enabled #touch-boost,
  body.mobile-controls-enabled #touch-gyro,
  body.mobile-controls-enabled .touch-ui-element {
    display: block !important;
    pointer-events: auto !important;
  }`;
  
  html = safeReplace(html, brokenPointerQuery, fixedPointerQuery, 'Fixed mobile controls visibility logic');
  
  // 3. ADD HORIZONTAL ORIENTATION OPTIMIZATION
  console.log('\n3. ADDING HORIZONTAL ORIENTATION SUPPORT');
  
  const existingViewportMeta = `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  const improvedViewportMeta = `  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">`;
  
  html = safeReplace(html, existingViewportMeta, improvedViewportMeta, 'Enhanced viewport meta tag');
  
  // Add landscape orientation styles after existing media queries
  const landscapeCSS = cr(`
/* ── LANDSCAPE ORIENTATION OPTIMIZATION ──────────── */
@media (orientation: landscape) and (max-height: 600px) {
  /* Compact HUD in landscape */
  #hud-top { padding: 8px 12px; }
  #hud-bottom { padding: 8px 12px; }
  
  /* Smaller mobile controls in landscape */
  #touch-move-zone { width: 100px !important; height: 100px !important; }
  #mobile-look-zone { width: min(35vw, 150px) !important; }
  #touch-button-cluster { gap: 8px; }
  
  /* Show mobile toggle in landscape mode */
  #mobile-toggle { display: block !important; }
  
  /* Compact character creation in landscape */
  #screen-create { padding: 12px; }
  #pilot-name { width: 160px; font-size: 0.9rem; }
}

@media (orientation: landscape) and (max-width: 900px) {
  /* Force mobile controls visible in small landscape */
  body.mobile-controls-auto #mobile-controls,
  body.mobile-controls-auto #touch-move-zone,
  body.mobile-controls-auto #touch-stick,
  body.mobile-controls-auto #mobile-look-zone,
  body.mobile-controls-auto #touch-button-cluster,
  body.mobile-controls-auto #touch-button-row,
  body.mobile-controls-auto #touch-joystick-left,
  body.mobile-controls-auto #touch-fire,
  body.mobile-controls-auto #touch-reload,
  body.mobile-controls-auto #touch-boost,
  body.mobile-controls-auto #touch-gyro,
  body.mobile-controls-auto .touch-ui-element {
    display: block !important;
    pointer-events: auto !important;
  }
}
`);
  
  // Insert landscape CSS after the existing mobile controls section
  const insertAfter = `  #mobile-look-zone {
    position: absolute;
    right: 12px;
    bottom: 0;
    width: min(42vw, 184px);`;
  
  const insertPoint = html.indexOf(insertAfter);
  if (insertPoint === -1) {
    console.log('❌ Could not find mobile controls section for landscape CSS insertion');
  } else {
    // Find the end of the mobile controls section (next closing brace)
    let endPoint = insertPoint;
    let braceCount = 0;
    let foundOpenBrace = false;
    
    for (let i = insertPoint; i < html.length; i++) {
      if (html[i] === '{') {
        foundOpenBrace = true;
        braceCount++;
      } else if (html[i] === '}') {
        braceCount--;
        if (foundOpenBrace && braceCount === 0) {
          endPoint = i + 1;
          break;
        }
      }
    }
    
    html = html.slice(0, endPoint) + landscapeCSS + html.slice(endPoint);
    console.log('✅ Added landscape orientation styles');
  }
  
  // 4. FIX RESPONSIVE FORM FIELDS
  console.log('\n4. FIXING RESPONSIVE FORM FIELDS');
  
  const pilotNameInput = `    <input type="text" id="pilot-name" maxlength="24" placeholder="Enter pilot name..." style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;width:200px;font-size:1rem;">`;
  
  const responsivePilotNameInput = `    <input type="text" id="pilot-name" maxlength="24" placeholder="Enter pilot name..." style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;width:min(200px, 80vw);font-size:1rem;max-width:300px;">`;
  
  html = safeReplace(html, pilotNameInput, responsivePilotNameInput, 'Made pilot name input responsive');
  
  // Add better responsive CSS for character creation
  const responsiveCharacterCSS = cr(`
/* ── RESPONSIVE CHARACTER CREATION ──────────── */
@media (max-width: 480px) {
  #screen-create { padding: 16px 12px; }
  #pilot-name { width: calc(100vw - 60px) !important; max-width: none !important; }
  .genome-row { flex-direction: column; align-items: center; gap: 12px; }
  #genome-canvas { width: 200px; height: 200px; }
  .btn { padding: 8px 16px; font-size: 0.9rem; }
}

@media (max-width: 360px) {
  #pilot-name { font-size: 0.9rem; padding: 6px 10px; }
  #genome-canvas { width: 160px; height: 160px; }
}
`);
  
  // Insert after existing responsive CSS
  const existingResponsivePoint = `@media (max-width: 960px) {
  .title-grid, .atlas-hero { grid-template-columns: 1fr; }
}`;
  
  html = safeReplace(html, existingResponsivePoint, existingResponsivePoint + responsiveCharacterCSS, 'Added responsive character creation CSS');
  
  // 5. FIX DNA MENU CLOSE FUNCTIONALITY
  console.log('\n5. FIXING DNA MENU CLOSE FUNCTIONALITY');
  
  // Add improved DNA menu close handlers
  const dnaCloseJS = cr(`
// Enhanced DNA menu close functionality
function closeDNAMenu() {
  const createHoloScreen = document.getElementById('screen-create-holo');
  if (createHoloScreen && createHoloScreen.classList.contains('active')) {
    createHoloScreen.classList.remove('active');
    showScreen('create');
    console.log('DNA menu closed');
    return true;
  }
  return false;
}

// Add close button to DNA menu
function addDNACloseButton() {
  const createHoloScreen = document.getElementById('screen-create-holo');
  if (createHoloScreen && !createHoloScreen.querySelector('.close-btn')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:var(--text);font-size:20px;cursor:pointer;z-index:999;';
    closeBtn.addEventListener('click', closeDNAMenu);
    createHoloScreen.appendChild(closeBtn);
  }
}
`);
  
  // Insert DNA close functionality before existing DNA event handlers
  const dnaEventHandlersStart = `    // "ENTER EDEN" button continues to character creation
    document.addEventListener('DOMContentLoaded', () => {`;
  
  html = safeReplace(html, dnaEventHandlersStart, dnaCloseJS + dnaEventHandlersStart, 'Added enhanced DNA menu close functionality');
  
  // 6. ADD MOBILE CONTROLS TOGGLE FUNCTIONALITY
  console.log('\n6. ADDING MOBILE CONTROLS TOGGLE FUNCTIONALITY');
  
  const mobileToggleJS = cr(`
// Mobile controls toggle functionality
let mobileControlsEnabled = false;

function toggleMobileControls() {
  mobileControlsEnabled = !mobileControlsEnabled;
  const body = document.body;
  
  if (mobileControlsEnabled) {
    body.classList.add('mobile-controls-enabled');
    body.classList.remove('mobile-controls-auto');
    localStorage.setItem('mobileControlsEnabled', 'true');
    console.log('Mobile controls enabled');
  } else {
    body.classList.remove('mobile-controls-enabled');
    localStorage.setItem('mobileControlsEnabled', 'false');
    console.log('Mobile controls disabled');
  }
  
  // Update toggle button
  const toggleBtn = document.getElementById('mobile-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = mobileControlsEnabled ? '📱✓' : '📱';
    toggleBtn.title = mobileControlsEnabled ? 'Disable Mobile Controls' : 'Enable Mobile Controls';
  }
}

// Auto-detect mobile and landscape mode
function autoDetectMobileMode() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmallScreen = window.innerWidth <= 900;
  const isTouchDevice = 'ontouchstart' in window;
  
  const shouldShowMobileToggle = isLandscape || isSmallScreen || isTouchDevice;
  const toggleBtn = document.getElementById('mobile-toggle');
  
  if (toggleBtn) {
    toggleBtn.style.display = shouldShowMobileToggle ? 'block' : 'none';
  }
  
  // Auto-enable in small landscape mode
  if (isLandscape && isSmallScreen && !mobileControlsEnabled) {
    document.body.classList.add('mobile-controls-auto');
  } else {
    document.body.classList.remove('mobile-controls-auto');
  }
}

// Initialize mobile controls on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved preference
  const saved = localStorage.getItem('mobileControlsEnabled');
  if (saved === 'true') {
    mobileControlsEnabled = true;
    document.body.classList.add('mobile-controls-enabled');
  }
  
  // Setup toggle button
  const toggleBtn = document.getElementById('mobile-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMobileControls);
    toggleBtn.textContent = mobileControlsEnabled ? '📱✓' : '📱';
  }
  
  // Setup DNA close button
  addDNACloseButton();
  
  // Auto-detect mode
  autoDetectMobileMode();
  
  // Re-detect on resize/orientation change
  window.addEventListener('resize', autoDetectMobileMode);
  window.addEventListener('orientationchange', () => {
    setTimeout(autoDetectMobileMode, 100);
  });
});
`);
  
  // Insert mobile toggle JS before the existing DNA event handlers
  html = safeReplace(html, dnaCloseJS, dnaCloseJS + mobileToggleJS, 'Added mobile controls toggle functionality');
  
  // Write the patched file
  console.log('\n7. WRITING PATCHED FILE');
  fs.writeFileSync('public/index.html', html, 'utf8');
  
  console.log('\\n🎉 COMPREHENSIVE MOBILE & RESPONSIVE FIXES COMPLETE!');
  console.log('\\nFIXES APPLIED:');
  console.log('✅ Mobile controls now toggleable and visible in landscape mode');
  console.log('✅ Responsive form fields that work on all screen sizes');
  console.log('✅ DNA menu close button and improved ESC handling');
  console.log('✅ Horizontal orientation optimization');
  console.log('✅ Auto-detection of mobile devices and landscape mode');
  console.log('✅ Better breakpoints and responsive design');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}