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

console.log('🔧 MAKING DNA CLOSE FUNCTION GLOBAL');
console.log('   - Add window.closeDNAMenu assignment');

const indexPath = 'public/index.html';
let content = fs.readFileSync(indexPath, 'utf-8');

try {
  // Add global assignment after the function definition
  const oldFunctionEnd = `      return false;
    }

    function toggleMobileControls() {`;

  const newFunctionEnd = cr(`      return false;
    }
    
    // Make closeDNAMenu globally accessible
    window.closeDNAMenu = closeDNAMenu;

    function toggleMobileControls() {`);

  content = safeReplace(content, oldFunctionEnd, newFunctionEnd);
  console.log('✅ ADDED: Global window.closeDNAMenu assignment');

} catch (error) {
  console.error(`❌ PATCH FAILED: ${error.message}`);
  process.exit(1);
}

// Write the fixed content
fs.writeFileSync(indexPath, content);

console.log('\n🎯 DNA CLOSE FUNCTION IS NOW GLOBAL!');
console.log('   ✅ closeDNAMenu available as window.closeDNAMenu');
console.log('\n   Files modified: public/index.html');