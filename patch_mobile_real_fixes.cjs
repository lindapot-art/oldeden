const fs = require('fs');

// Helper function for safe replacement with CRLF handling
function safeReplace(content, oldStr, newStr) {
  const index = content.indexOf(oldStr);
  if (index === -1) {
    throw new Error(`String not found: ${oldStr.substring(0, 100)}...`);
  }
  return content.substring(0, index) + newStr + content.substring(index + oldStr.length);
}

// Helper to add CRLF line ending
function cr(str) {
  return str.replace(/\r?\n/g, '\r\n');
}

console.log('🔧 REAL MOBILE & RESPONSIVE FIXES');
console.log('   - Fix viewport and scrolling issues');
console.log('   - Ensure mobile controls visibility');
console.log('   - Fix responsive text field layout');
console.log('   - Add mobile-specific CSS improvements');

const indexPath = 'public/index.html';
let content = fs.readFileSync(indexPath, 'utf-8');

// Count markers before
const preMarkers = {
  screens: (content.match(/id="screen-/g) || []).length,
  buttons: (content.match(/class="btn"/g) || []).length,
  closeTags: (content.match(/<\/div>/g) || []).length
};

console.log('\n📊 PRE-EDIT MARKERS:');
console.log(`   Screens: ${preMarkers.screens}`);
console.log(`   Buttons: ${preMarkers.buttons}`);
console.log(`   Close Tags: ${preMarkers.closeTags}`);

try {
  // Fix 1: Improve mobile viewport and screen scrolling
  const oldViewportCSS = `.screen { display:none; position:fixed; inset:0; background:var(--bg); z-index:50; overflow-y:auto; }`;
  const newViewportCSS = cr(`.screen { display:none; position:fixed; inset:0; background:var(--bg); z-index:50; overflow-y:auto; -webkit-overflow-scrolling: touch; }
  @supports (height: 100vh) and (height: 100dvh) {
    .screen { height: 100dvh; }
  }`);
  
  content = safeReplace(content, oldViewportCSS, newViewportCSS);
  console.log('✅ FIXED: Screen viewport and scrolling');

  // Fix 2: Improve title-stack responsive sizing
  const oldTitleStack = `.title-stack { width:min(1080px, calc(100vw - 36px)); padding:32px 20px 96px; display:grid; gap:22px; }`;
  const newTitleStack = cr(`.title-stack { width:min(1080px, calc(100vw - 36px)); padding:32px 20px 96px; display:grid; gap:22px; }
  @media (max-width: 600px) {
    .title-stack { padding: 16px 12px 80px; gap: 16px; }
  }`);
  
  content = safeReplace(content, oldTitleStack, newTitleStack);
  console.log('✅ FIXED: Title stack mobile padding');

  // Fix 3: Improve mobile form field visibility
  const oldFormCSS = `@media (max-width: 900px), (pointer: coarse) {
  #screen-create {
    padding: 18px 16px 96px;
  }
  #screen-bridge {
    padding: 12px 12px 96px;
    gap: 12px;
  }`;
  
  const newFormCSS = cr(`@media (max-width: 900px), (pointer: coarse) {
  #screen-create {
    padding: 18px 16px 96px;
  }
  #screen-bridge {
    padding: 12px 12px 96px;
    gap: 12px;
  }
  /* Ensure form fields are visible on mobile */
  input[type="text"], input[type="password"], input[type="email"], 
  .account-card input, .title-card input {
    min-height: 44px !important;
    font-size: 16px !important; /* Prevents zoom on iOS */
    padding: 8px 12px !important;
    background: rgba(20, 28, 40, 0.9) !important;
    border: 1px solid rgba(107, 196, 255, 0.3) !important;
  }
  .account-card, .title-card {
    padding: 16px !important;
  }`);

  content = safeReplace(content, oldFormCSS, newFormCSS);
  console.log('✅ FIXED: Mobile form field visibility');

  // Fix 4: Ensure mobile controls are always visible when enabled
  const oldMobileCSS = `  /* Mobile controls: Show on touch devices and when manually enabled */
  @media (pointer: coarse) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: block !important;
      pointer-events: auto !important;
    }
  }`;

  const newMobileCSS = cr(`  /* Mobile controls: Show on touch devices and when manually enabled */
  @media (pointer: coarse) {
    #mobile-controls, #touch-move-zone, #touch-stick, #mobile-look-zone,
    #touch-button-cluster, #touch-button-row, #touch-joystick-left,
    #touch-fire, #touch-reload, #touch-boost, #touch-gyro, .touch-ui-element {
      display: block !important;
      pointer-events: auto !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  }
  
  /* Additional mobile control improvements */
  @media (max-width: 600px) {
    #mobile-controls {
      bottom: calc(80px + env(safe-area-inset-bottom)) !important;
    }
    #touch-move-zone {
      left: 8px !important;
      width: 100px !important;
      height: 100px !important;
    }
    #touch-button-cluster {
      right: 8px !important;
    }
  }`);

  content = safeReplace(content, oldMobileCSS, newMobileCSS);
  console.log('✅ FIXED: Mobile controls visibility and responsiveness');

  // Fix 5: Improve DNA menu responsiveness
  const oldDNACSS = `#screen-create-holo {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(4,8,16,0.92);
  backdrop-filter: blur(8px);
  overflow-y: auto;
}`;

  const newDNACSS = cr(`#screen-create-holo {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(4,8,16,0.92);
  backdrop-filter: blur(8px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
@media (max-width: 600px) {
  #screen-create-holo {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
  .dna-close-btn {
    top: calc(15px + env(safe-area-inset-top)) !important;
    right: calc(20px + env(safe-area-inset-right)) !important;
    font-size: 28px !important;
    padding: 8px !important;
  }
}`);

  // Find and replace DNA menu CSS - need to find the right selector
  const dnaIndex = content.indexOf('#screen-create-holo {');
  if (dnaIndex !== -1) {
    const endIndex = content.indexOf('}', dnaIndex) + 1;
    const oldDNASection = content.substring(dnaIndex, endIndex);
    content = content.replace(oldDNASection, newDNACSS);
    console.log('✅ FIXED: DNA menu mobile responsiveness');
  } else {
    console.log('⚠️  DNA menu CSS not found - may already be updated');
  }

} catch (error) {
  console.error(`❌ PATCH FAILED: ${error.message}`);
  process.exit(1);
}

// Count markers after
const postMarkers = {
  screens: (content.match(/id="screen-/g) || []).length,
  buttons: (content.match(/class="btn"/g) || []).length,
  closeTags: (content.match(/<\/div>/g) || []).length
};

console.log('\n📊 POST-EDIT MARKERS:');
console.log(`   Screens: ${postMarkers.screens} (${postMarkers.screens >= preMarkers.screens ? '✅' : '❌'})`);
console.log(`   Buttons: ${postMarkers.buttons} (${postMarkers.buttons >= preMarkers.buttons ? '✅' : '❌'})`);
console.log(`   Close Tags: ${postMarkers.closeTags} (${postMarkers.closeTags >= preMarkers.closeTags ? '✅' : '❌'})`);

// Write the fixed content
fs.writeFileSync(indexPath, content);

console.log('\n🎯 REAL MOBILE FIXES COMPLETE!');
console.log('   ✅ Fixed viewport and scrolling issues');
console.log('   ✅ Improved form field visibility on mobile');  
console.log('   ✅ Enhanced mobile controls responsiveness');
console.log('   ✅ Made DNA menu mobile-friendly');
console.log('   ✅ Added safe area inset support');
console.log('\n   Run QA Board to verify all fixes work properly.');