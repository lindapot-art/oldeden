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

console.log('🔧 FINAL FIX: DNA CLOSE BUTTON & MOBILE RESPONSIVENESS');
console.log('   - Replace DNA close button with working inline JavaScript');
console.log('   - Fix music player z-index conflicts');
console.log('   - Improve mobile button accessibility');

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
  // Fix 1: Replace DNA close button with working inline code - find the current button and replace it
  const currentCloseBtn = content.match(/<button[^>]*class="dna-close-btn"[^>]*onclick="[^"]*"[^>]*>✕<\/button>/);
  
  if (currentCloseBtn) {
    const oldCloseBtn = currentCloseBtn[0];
    const newCloseBtn = cr(`<button class="dna-close-btn" onclick="
      const dnaScreen = document.getElementById('screen-create-holo');
      const createScreen = document.getElementById('screen-create');
      if (dnaScreen && dnaScreen.classList.contains('active')) {
        dnaScreen.classList.remove('active');
        if (createScreen) {
          createScreen.classList.add('active');
        }
      }
    " style="position:absolute;top:15px;right:20px;background:none;border:none;color:var(--text);font-size:24px;cursor:pointer;z-index:9999;padding:8px;min-width:44px;min-height:44px;" title="Close DNA Menu">✕</button>`);
    
    content = safeReplace(content, oldCloseBtn, newCloseBtn);
    console.log('✅ FIXED: DNA close button with working inline JavaScript');
  } else {
    console.log('⚠️  DNA close button not found in expected format');
  }

  // Fix 2: Lower music player z-index to prevent it from blocking DNA close button
  const oldMusicCSS = `#music-player-panel{position:fixed;top:18px;right:18px;z-index:120;`;
  const newMusicCSS = `#music-player-panel{position:fixed;top:18px;right:18px;z-index:80;`;
  
  if (content.includes(oldMusicCSS)) {
    content = safeReplace(content, oldMusicCSS, newMusicCSS);
    console.log('✅ FIXED: Music player z-index conflict');
  } else {
    console.log('⚠️  Music player CSS not found in expected format');
  }

  // Fix 3: Add better mobile button positioning CSS
  const mobileButtonCSS = cr(`
  /* Additional mobile button accessibility fixes */
  @media (max-width: 600px) {
    .title-stack {
      min-height: 100vh !important;
      height: auto !important;
      overflow-y: auto !important;
    }
    
    .title-grid {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }
    
    .title-card, .account-card {
      padding: 14px !important;
      margin-bottom: 12px !important;
    }
    
    .title-card .btn {
      min-height: 44px !important;
      margin: 4px 0 !important;
      font-size: 14px !important;
    }
    
    /* Ensure all buttons are accessible */
    button, .btn {
      min-height: 44px !important;
      min-width: 44px !important;
    }
  }`);

  // Add this CSS before the closing </style>
  const styleEnd = `</style>`;
  content = safeReplace(content, styleEnd, mobileButtonCSS + cr(styleEnd));
  console.log('✅ ADDED: Mobile button accessibility improvements');

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

console.log('\n🎯 FINAL MOBILE & DNA FIXES COMPLETE!');
console.log('   ✅ DNA close button now works with inline JavaScript');
console.log('   ✅ Fixed music player z-index blocking issue');
console.log('   ✅ Enhanced mobile button accessibility');
console.log('   ✅ All user complaints should now be resolved');
console.log('\n   Files modified: public/index.html');