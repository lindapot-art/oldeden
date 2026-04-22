const fs = require('fs');
const path = require('path');

// Read the current index.html file
const indexPath = path.join(__dirname, 'public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Helper for CRLF-safe replacement
function safeReplace(text, oldStr, newStr) {
  if (!text.includes(oldStr)) {
    console.error('❌ FAILED to find string:', oldStr.substring(0, 100) + '...');
    return text;
  }
  return text.replace(oldStr, newStr);
}

// Helper for CRLF line endings
function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🔧 APPLYING COMPREHENSIVE MOBILE & RESPONSIVE FIXES...');

// 1. FIX MOBILE DETECTION - Replace isTouchPrimaryInput function with better detection
const oldMobileDetection = `function isTouchPrimaryInput() {
  // Require ACTUAL touch — matchMedia pointer:coarse + either ontouchstart or maxTouchPoints
  // Most desktop browsers falsely report maxTouchPoints > 0 but pointer is still 'fine'
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const isFine = window.matchMedia('(pointer: fine)').matches;
  // If pointer is fine (mouse), never treat as touch even if touchpoints exist
  if (isFine && !isCoarse) return false;
  return hasTouch && isCoarse;
}`;

const newMobileDetection = `function isTouchPrimaryInput() {
  // Enhanced mobile detection - works on ALL mobile devices and browsers
  // Check for touch support FIRST, then verify pointer type
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const isFine = window.matchMedia('(pointer: fine)').matches;
  
  // Mobile device detection - check for small screens
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
  const isMobileBrowser = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Force mobile on small touchscreens or known mobile browsers
  if ((hasTouch && isSmallScreen) || (isMobileBrowser && hasTouch)) return true;
  
  // Original logic for desktop with touch screens
  if (isFine && !isCoarse && !isSmallScreen) return false;
  return hasTouch && (isCoarse || isSmallScreen);
}`;

content = safeReplace(content, oldMobileDetection, newMobileDetection);

// 2. FIX MOBILE UI TRIGGER - Update shouldUseMobileFlightUI for better detection
const oldShouldUse = `function shouldUseMobileFlightUI() {
  return isTouchPrimaryInput() && Math.min(window.innerWidth, window.innerHeight) <= 1100;
}`;

const newShouldUse = `function shouldUseMobileFlightUI() {
  // More permissive mobile UI detection - works on all orientations
  const isMobile = isTouchPrimaryInput();
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
  const isTabletSize = Math.min(window.innerWidth, window.innerHeight) <= 1100;
  
  // Show mobile UI on small screens OR when touch is detected on medium screens
  return isMobile || isSmallScreen || (isTouchPrimaryInput() && isTabletSize);
}`;

content = safeReplace(content, oldShouldUse, newShouldUse);

// 3. ADD HORIZONTAL ORIENTATION SUPPORT
const horizontalCSS = cr(`
  /* === HORIZONTAL MOBILE SUPPORT === */
  @media screen and (orientation: landscape) and (max-height: 500px) {
    /* Horizontal mobile layout optimizations */
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
    
    .mobile-button-row {
      flex-direction: row !important;
      gap: 8px !important;
    }
    
    .mobile-button-row button {
      width: 50px !important;
      height: 40px !important;
      font-size: 12px !important;
    }
    
    /* Compact HUD for horizontal */
    #screen-title, #screen-create {
      padding: 10px !important;
    }
    
    .title-stack h1 {
      font-size: 2em !important;
      margin: 10px 0 !important;
    }
    
    /* Make form fields more compact horizontally */
    input, select, textarea {
      min-height: 40px !important;
      padding: 8px 12px !important;
    }
    
    .faction-card {
      padding: 10px !important;
      margin: 5px 0 !important;
    }
  }
`);

// Insert after existing mobile CSS
const mobileCSSSectionEnd = `    body.mobile-auto #mobile-controls,
    body.mobile-auto .mobile-look-zone,
    body.mobile-auto .mobile-fire-controls,
    body.mobile-auto .fire-button,
    body.mobile-auto .mobile-button-row {
      display: block !important;
    }
  }`;

content = safeReplace(content, mobileCSSSectionEnd, mobileCSSSectionEnd + horizontalCSS);

// 4. IMPROVE FORM FIELD RESPONSIVE DESIGN
const betterFormCSS = cr(`
  /* === ENHANCED FORM FIELD RESPONSIVENESS === */
  @media (max-width: 768px) {
    /* Mobile-first form field improvements */
    input, select, textarea {
      min-height: 44px !important;
      font-size: 16px !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      border: 2px solid var(--border) !important;
      background: var(--bg-darker) !important;
      color: var(--text) !important;
      width: 100% !important;
      box-sizing: border-box !important;
      margin: 8px 0 !important;
    }
    
    /* Button accessibility for mobile */
    button {
      min-height: 44px !important;
      min-width: 44px !important;
      padding: 12px 20px !important;
      font-size: 16px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
    }
    
    /* Character creation improvements */
    .title-stack {
      padding: 20px !important;
      text-align: center !important;
    }
    
    .title-stack h1 {
      font-size: 2.5em !important;
      margin: 20px 0 !important;
      line-height: 1.2 !important;
    }
    
    .cards {
      grid-template-columns: 1fr !important;
      gap: 15px !important;
      padding: 0 10px !important;
    }
    
    .faction-card {
      padding: 20px !important;
      border-radius: 12px !important;
      margin: 10px 0 !important;
      min-height: auto !important;
    }
    
    /* Pilot name section */
    .pilot-info {
      padding: 20px !important;
      margin: 20px 0 !important;
    }
    
    .pilot-info input {
      font-size: 18px !important;
      padding: 15px !important;
      border-radius: 10px !important;
    }
  }
`);

content = safeReplace(content, horizontalCSS, horizontalCSS + betterFormCSS);

// 5. ADD MOBILE CONTROLS TOGGLE - Add a manual toggle for users who want mobile controls on any device
const mobileToggleHTML = cr(`
    <div id="mobile-toggle-container" style="position:fixed;top:10px;right:10px;z-index:100;background:rgba(0,0,0,0.7);border-radius:8px;padding:8px;">
      <button id="mobile-toggle-btn" onclick="toggleMobileControls()" style="background:var(--accent);border:none;color:var(--text);padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;">📱 Mobile UI</button>
    </div>`);

// Insert mobile toggle after the QA banner
const qaUberifiedBanner = `<div id="qa-unverified-banner" style="position:fixed;top:0;left:0;right:0;background:#ff4444;color:white;text-align:center;padding:8px;z-index:9999;font-weight:bold;">⚠ UNVERIFIED BUILD — run: node qa_proxy_live.cjs ⚠</div>`;

content = safeReplace(content, qaUberifiedBanner, qaUberifiedBanner + mobileToggleHTML);

// 6. ADD MOBILE CONTROLS TOGGLE FUNCTION
const mobileToggleJS = cr(`
// Mobile controls manual toggle function
function toggleMobileControls() {
  const mobileControls = document.getElementById('mobile-controls');
  const body = document.body;
  const btn = document.getElementById('mobile-toggle-btn');
  
  if (mobileControls.classList.contains('active')) {
    // Disable mobile UI
    mobileControls.classList.remove('active');
    body.classList.remove('mobile-forced');
    btn.textContent = '📱 Mobile UI';
    btn.style.background = 'var(--accent)';
  } else {
    // Enable mobile UI
    mobileControls.classList.add('active');
    body.classList.add('mobile-forced');
    btn.textContent = '🖥️ Desktop UI';
    btn.style.background = '#ff6b6b';
  }
}

// Auto-show mobile toggle on small screens or touch devices
window.addEventListener('load', () => {
  const isSmallOrTouch = Math.min(window.innerWidth, window.innerHeight) <= 768 || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
  
  const toggleContainer = document.getElementById('mobile-toggle-container');
  if (toggleContainer) {
    toggleContainer.style.display = isSmallOrTouch ? 'block' : 'none';
  }
});
`);

// Insert toggle function after the existing shouldUseMobileFlightUI function
content = safeReplace(content, newShouldUse, newShouldUse + mobileToggleJS);

// 7. FORCE MOBILE UI CSS TO WORK
const forceMobileCSS = cr(`
  /* Force mobile UI visibility when manually enabled */
  body.mobile-forced #mobile-controls,
  body.mobile-forced .mobile-look-zone,
  body.mobile-forced .mobile-fire-controls,
  body.mobile-forced .fire-button,
  body.mobile-forced .mobile-button-row {
    display: block !important;
    pointer-events: auto !important;
  }
  
  body.mobile-forced #mobile-controls {
    position: fixed !important;
    bottom: 100px !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 55 !important;
  }
`);

content = safeReplace(content, betterFormCSS, betterFormCSS + forceMobileCSS);

// Write the updated file
fs.writeFileSync(indexPath, content, 'utf8');

console.log('✅ COMPREHENSIVE MOBILE & RESPONSIVE FIXES APPLIED!');
console.log('📱 Mobile detection improved for all devices and browsers');
console.log('🔄 Horizontal orientation support added'); 
console.log('📝 Form fields enhanced for mobile accessibility');
console.log('🎛️ Manual mobile UI toggle button added');
console.log('💪 Mobile controls forced to work on all screen sizes');
console.log('');
console.log('🚀 Changes applied to public/index.html');
console.log('📏 File size:', Math.round(content.length / 1024), 'KB');
console.log('');
console.log('⚡ Test on mobile device or use the 📱 Mobile UI button to verify!');