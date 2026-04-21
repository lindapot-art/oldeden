// Fix Syntax Error - Remove Duplicated Switch Content
const fs = require('fs');

console.log('🔧 Fixing syntax error - removing duplicated switch content...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// Find the first correct ending of the switch statement
const correctSwitchEnd = `        e.group.lookAt(ship.position);`;
const firstOccurrence = content.indexOf(correctSwitchEnd);

if (firstOccurrence === -1) {
  console.log('❌ Could not find switch statement end marker');
  process.exit(1);
}

// Find the second occurrence (the duplicated one)
const secondOccurrence = content.indexOf(correctSwitchEnd, firstOccurrence + 1);

if (secondOccurrence === -1) {
  console.log('❌ No duplicate found - code may already be fixed');
  process.exit(0);
}

// Find the end of the duplicated section by looking for the next logical break
// Look for the line after the duplicate that should remain
const nextValidLine = `      e.hitFlash = Math.max(0, e.hitFlash - dtMs);`;
const endOfDuplicateSection = content.indexOf(nextValidLine);

if (endOfDuplicateSection === -1) {
  console.log('❌ Could not find end of duplicate section');
  process.exit(1);
}

// Calculate what to remove - from right after first occurrence to right before the valid line
const startRemove = firstOccurrence + correctSwitchEnd.length;
const endRemove = endOfDuplicateSection;

console.log(`Removing duplicated content from position ${startRemove} to ${endRemove}`);
console.log(`Duplicate section length: ${endRemove - startRemove} characters`);

// Remove the duplicated section
const beforeDuplicate = content.substring(0, startRemove);
const afterDuplicate = content.substring(endRemove);
const fixedContent = beforeDuplicate + '\n      ' + afterDuplicate.substring(6); // Adjust indentation

// Write the fixed content
fs.writeFileSync(htmlPath, fixedContent);

console.log('✅ Syntax error fixed - duplicated switch content removed');
console.log('📊 Changes made:');
console.log('   • Removed duplicated enemy AI switch cases');
console.log('   • Fixed brace mismatch issue');
console.log('   • Preserved enhanced boss AI functionality');