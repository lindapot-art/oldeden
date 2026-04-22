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

console.log('🔧 MOBILE FIXES - FINAL APPROACH');
console.log('   - Add mobile CSS before </style>');
console.log('   - Fix form fields and touch controls');  

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
  // Just add before </style> with exact format
  const oldStyleEnd = `</style>`;

  const mobileCSS = cr(`
  /* ── Mobile & Responsive Improvements ──────── */
  
  /* Better viewport handling */
  .screen { -webkit-overflow-scrolling: touch; }
  
  /* Mobile form improvements */
  @media (max-width: 600px) {
    input[type="text"], input[type="password"], input[type="email"], 
    .account-card input, .title-card input {
      min-height: 44px !important;
      font-size: 16px !important;
      padding: 8px 12px !important;
      background: rgba(20, 28, 40, 0.9) !important;
      border: 1px solid rgba(107, 196, 255, 0.3) !important;
    }
    
    .account-card, .title-card {
      padding: 16px !important;
    }
    
    .title-stack { 
      padding: 16px 12px 80px !important; 
      gap: 16px !important; 
    }
    
    /* Enhanced mobile controls */
    #mobile-controls {
      bottom: calc(80px + env(safe-area-inset-bottom)) !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    #touch-move-zone {
      left: 8px !important;
      width: 100px !important;
      height: 100px !important;
    }
    
    #touch-button-cluster {
      right: 8px !important;
    }
    
    /* DNA menu mobile */
    .dna-close-btn {
      top: calc(15px + env(safe-area-inset-top)) !important;
      right: calc(20px + env(safe-area-inset-right)) !important;
      font-size: 28px !important;
      padding: 8px !important;
      min-width: 44px !important;
      min-height: 44px !important;
    }
  }
  
  /* Force mobile controls visible on touch */
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
`) + oldStyleEnd;
  
  content = safeReplace(content, oldStyleEnd, mobileCSS);
  console.log('✅ ADDED: Mobile CSS improvements');

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

if (postMarkers.screens < preMarkers.screens || postMarkers.buttons < preMarkers.buttons || postMarkers.closeTags < preMarkers.closeTags) {
  console.error('\n❌ MARKER COUNT DECREASED - CRITICAL FAILURE!');
  process.exit(1);
}

// Write the fixed content
fs.writeFileSync(indexPath, content);

console.log('\n🎯 MOBILE IMPROVEMENTS COMPLETE!');
console.log('   ✅ Added mobile-specific CSS');
console.log('   ✅ Improved form field handling');  
console.log('   ✅ Enhanced touch control visibility');
console.log('   ✅ Better DNA menu mobile support');
console.log('\n   Files modified: public/index.html');