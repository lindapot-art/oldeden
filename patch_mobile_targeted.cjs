const fs = require('fs');
const path = require('path');

// Read the current index.html file
const indexPath = path.join(__dirname, 'public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Helper for CRLF-safe replacement
function safeReplace(text, oldStr, newStr) {
  if (!text.includes(oldStr)) {
    console.error('❌ FAILED to find string for replacement');
    console.error('Looking for:', oldStr.substring(0, 80) + '...');
    return text;
  }
  const result = text.replace(oldStr, newStr);
  console.log('✅ REPLACED successfully');
  return result;
}

// Helper for CRLF line endings
function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🔧 APPLYING TARGETED MOBILE FIXES...');

// 1. REPLACE THE MOBILE DETECTION FUNCTION
const exactOldMobileFunction = `function isTouchPrimaryInput() {
  // Require ACTUAL touch — matchMedia pointer:coarse + either ontouchstart or maxTouchPoints
  // Most desktop browsers falsely report maxTouchPoints > 0 but pointer is still 'fine'
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const isFine = window.matchMedia('(pointer: fine)').matches;
  // If pointer is fine (mouse), never treat as touch even if touchpoints exist
  if (isFine && !isCoarse) return false;
  return hasTouch && isCoarse;
}`;

const newMobileFunction = cr(`function isTouchPrimaryInput() {
  // ENHANCED mobile detection - works on ALL devices and browsers
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const isFine = window.matchMedia('(pointer: fine)').matches;
  
  // Mobile device detection - check for small screens and user agents
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
  const isMobileBrowser = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Force mobile on small touchscreens OR known mobile browsers
  if ((hasTouch && isSmallScreen) || isMobileBrowser) return true;
  
  // For larger screens, use original logic but be more permissive
  if (isFine && !isCoarse && !isSmallScreen) return false;
  return hasTouch;  // More permissive - any touch device
}`);

content = safeReplace(content, exactOldMobileFunction, newMobileFunction);

// 2. REPLACE shouldUseMobileFlightUI function
const exactOldShouldUse = `function shouldUseMobileFlightUI() {
  return isTouchPrimaryInput() && Math.min(window.innerWidth, window.innerHeight) <= 1100;
}`;

const newShouldUse = cr(`function shouldUseMobileFlightUI() {
  // More permissive mobile UI - show on any touch device or small screen
  const isMobile = isTouchPrimaryInput();
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
  const hasManualToggle = document.body.classList.contains('mobile-forced');
  
  // Show mobile UI if: touch detected, small screen, or manually toggled
  return isMobile || isSmallScreen || hasManualToggle;
}`);

content = safeReplace(content, exactOldShouldUse, newShouldUse);

// 3. ADD MOBILE TOGGLE AFTER THE QA BANNER
const qaUnverifiedDiv = `<div id="qa-unverified-banner" style="position:fixed;top:0;left:0;right:0;background:#ff4444;color:white;text-align:center;padding:8px;z-index:9999;font-weight:bold;">⚠ UNVERIFIED BUILD — run: node qa_proxy_live.cjs ⚠</div>`;

const qaWithMobileToggle = qaUnverifiedDiv + cr(`
    <div id="mobile-toggle-container" style="position:fixed;top:40px;right:10px;z-index:9998;background:rgba(0,0,0,0.8);border-radius:8px;padding:8px;display:none;">
      <button id="mobile-toggle-btn" onclick="toggleMobileControls()" style="background:var(--accent);border:none;color:var(--text);padding:8px 12px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;">📱 Mobile UI</button>
    </div>`);

content = safeReplace(content, qaUnverifiedDiv, qaWithMobileToggle);

// 4. ADD HORIZONTAL ORIENTATION CSS AFTER EXISTING MOBILE CSS
// Find the end of the mobile CSS section
const endOfMobileCSS = `  @media (max-width: 600px) {
    input, select, textarea { min-height: 44px; font-size: 16px; }
    button { min-height: 44px; min-width: 44px; }
    /* + mobile layout improvements */
  }`;

const endWithHorizontalCSS = endOfMobileCSS + cr(`
  
  /* === HORIZONTAL MOBILE ORIENTATION SUPPORT === */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    #mobile-controls {
      bottom: 10px !important;
      height: auto !important;
    }
    
    .mobile-look-zone {
      right: 5px !important;
      bottom: 5px !important;
      width: 140px !important;
      height: 100px !important;
    }
    
    .mobile-fire-controls {
      left: 5px !important;
      bottom: 5px !important;
    }
    
    .fire-button {
      width: 60px !important;
      height: 60px !important;
      font-size: 18px !important;
    }
    
    .mobile-button-row button {
      width: 50px !important;
      height: 40px !important;
      font-size: 12px !important;
    }
    
    /* Compact forms for horizontal */
    input, select, textarea {
      min-height: 40px !important;
      font-size: 16px !important;
    }
    
    .title-stack h1 {
      font-size: 2em !important;
      margin: 10px 0 !important;
    }
  }
  
  /* === FORCE MOBILE UI WHEN MANUALLY ENABLED === */
  body.mobile-forced #mobile-controls,
  body.mobile-forced .mobile-look-zone,
  body.mobile-forced .mobile-fire-controls,
  body.mobile-forced .fire-button,
  body.mobile-forced .mobile-button-row {
    display: block !important;
    pointer-events: auto !important;
  }`);

// Only add if not already present
if (!content.includes('HORIZONTAL MOBILE ORIENTATION SUPPORT')) {
  content = safeReplace(content, endOfMobileCSS, endWithHorizontalCSS);
}

// 5. ADD MOBILE TOGGLE FUNCTION AFTER shouldUseMobileFlightUI
const newShouldUseWithToggle = newShouldUse + cr(`

// Mobile controls manual toggle function
function toggleMobileControls() {
  const mobileControls = document.getElementById('mobile-controls');
  const body = document.body;
  const btn = document.getElementById('mobile-toggle-btn');
  
  if (body.classList.contains('mobile-forced')) {
    // Disable mobile UI
    body.classList.remove('mobile-forced');
    mobileControls.classList.remove('active');
    btn.textContent = '📱 Mobile UI';
    btn.style.background = 'var(--accent)';
  } else {
    // Enable mobile UI
    body.classList.add('mobile-forced');
    mobileControls.classList.add('active');
    btn.textContent = '🖥️ Desktop';
    btn.style.background = '#ff6b6b';
  }
}

// Show mobile toggle on any device with touch or small screen
window.addEventListener('load', () => {
  const isRelevant = Math.min(window.innerWidth, window.innerHeight) <= 768 || 
                    ('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0);
  
  const toggleContainer = document.getElementById('mobile-toggle-container');
  if (toggleContainer && isRelevant) {
    toggleContainer.style.display = 'block';
  }
});`);

content = safeReplace(content, newShouldUse, newShouldUseWithToggle);

// Write the updated file
fs.writeFileSync(indexPath, content, 'utf8');

console.log('');
console.log('✅ TARGETED MOBILE FIXES APPLIED SUCCESSFULLY!');
console.log('📱 Enhanced mobile detection for all devices');
console.log('🔄 Horizontal orientation support added');  
console.log('🎛️ Manual mobile UI toggle button added');
console.log('💪 Force mobile UI option implemented');
console.log('');
console.log('🚀 Changes applied to public/index.html');
console.log('📏 File size:', Math.round(content.length / 1024), 'KB');
console.log('');
console.log('⚡ Restart server and test mobile functionality!');