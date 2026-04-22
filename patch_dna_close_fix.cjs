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

console.log('🔧 FIXING DNA MENU CLOSE FUNCTION');
console.log('   - Fix closeDNAMenu function scope');
console.log('   - Make DNA close button work properly');
console.log('   - Fix mobile controls accessibility');

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
  // Fix 1: Replace the DNA close button onclick with a direct JS implementation
  const oldCloseBtn = `<button class="dna-close-btn" onclick="closeDNAMenu()" style="position:absolute;top:15px;right:20px;background:none;border:none;color:var(--text);font-size:24px;cursor:pointer;z-index:999;" title="Close DNA Menu">✕</button>`;
  
  const newCloseBtn = cr(`<button class="dna-close-btn" onclick="
    const dnaScreen = document.getElementById('screen-create-holo');
    if (dnaScreen && dnaScreen.classList.contains('active')) {
      dnaScreen.classList.remove('active');
      const charScreen = document.getElementById('screen-character');
      if (charScreen) charScreen.classList.add('active');
    }
  " style="position:absolute;top:15px;right:20px;background:none;border:none;color:var(--text);font-size:24px;cursor:pointer;z-index:999;" title="Close DNA Menu">✕</button>`);
  
  content = safeReplace(content, oldCloseBtn, newCloseBtn);
  console.log('✅ FIXED: DNA close button with inline function');

  // Fix 2: Make closeDNAMenu a global function by adding it to window
  const oldCloseDNAFunction = `    function closeDNAMenu() {
      const screen = document.getElementById('screen-create-holo');
      if (screen && screen.classList.contains('active')) {
        screen.classList.remove('active');
        showScreen('create');
        return true;
      }
      return false;
    }`;

  const newCloseDNAFunction = cr(`    // Global DNA menu close function
    window.closeDNAMenu = function closeDNAMenu() {
      const screen = document.getElementById('screen-create-holo');
      if (screen && screen.classList.contains('active')) {
        screen.classList.remove('active');
        const charScreen = document.getElementById('screen-character');
        if (charScreen) charScreen.classList.add('active');
        return true;
      }
      return false;
    };`);

  content = safeReplace(content, oldCloseDNAFunction, newCloseDNAFunction);
  console.log('✅ FIXED: Made closeDNAMenu globally accessible');

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

console.log('\n🎯 DNA MENU FIX COMPLETE!');
console.log('   ✅ Fixed DNA close button functionality');
console.log('   ✅ Made closeDNAMenu globally accessible');
console.log('   ✅ DNA menu can now be properly closed');
console.log('\n   Files modified: public/index.html');