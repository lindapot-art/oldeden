#!/usr/bin/env node
// 👑 THE KING'S SIMPLE BRACE FIX
// Remove 4 extra closing braces from end of script

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: SIMPLE BRACE FIX');
console.log('═══════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function removeExtraClosingBraces(content) {
  // Find the last script tag
  const lastScriptStart = content.lastIndexOf('<script');
  const lastScriptEnd = content.indexOf('</script>', lastScriptStart);
  
  if (lastScriptStart === -1 || lastScriptEnd === -1) {
    console.log('❌ Could not find script section');
    return content;
  }
  
  // Get the script content
  let scriptSection = content.substring(lastScriptStart, lastScriptEnd);
  
  // Remove 4 closing braces from the end of the script
  let braceCount = 0;
  let fixedScript = scriptSection;
  
  for (let i = fixedScript.length - 1; i >= 0 && braceCount < 4; i--) {
    if (fixedScript[i] === '}') {
      // Check if this brace is not inside a string or comment
      const beforeBrace = fixedScript.substring(0, i);
      const afterBrace = fixedScript.substring(i + 1);
      
      // Simple check - if there's whitespace or newline around it, it's likely a real brace
      if ((i === 0 || /\s/.test(fixedScript[i-1])) && 
          (i === fixedScript.length - 1 || /\s/.test(fixedScript[i+1]))) {
        fixedScript = beforeBrace + afterBrace;
        braceCount++;
        console.log(`🔧 Removed closing brace #${braceCount} at position ${i}`);
        i++; // Adjust for removed character
      }
    }
  }
  
  // Reconstruct the full content
  return content.substring(0, lastScriptStart) + fixedScript + content.substring(lastScriptEnd);
}

try {
  console.log('📖 Reading index.html...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  console.log('🔧 Removing extra closing braces...');
  const fixedContent = removeExtraClosingBraces(content);
  
  console.log('💾 Saving fixed index.html...');
  fs.writeFileSync(indexPath, fixedContent);
  
  console.log('✅ Simple brace fix complete!');
  
} catch (error) {
  console.error('❌ FIX FAILED:', error);
  process.exit(1);
}