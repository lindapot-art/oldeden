const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

console.log('🔧 FIXING: Duplicate function declarations');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Rename the weapon system muzzle flash function to avoid conflicts
indexContent = safeReplace(indexContent, 
  'function createMuzzleFlash(weapon) {',
  'function createWeaponMuzzleFlash(weapon) {'
);

// Update the call to use the new name
indexContent = safeReplace(indexContent,
  '    createMuzzleFlash(weapon);',
  '    createWeaponMuzzleFlash(weapon);'
);

// Also check for other potential duplicates - let's look for initWeaponSystem
const initWeaponCount = (indexContent.match(/function initWeaponSystem/g) || []).length;
if (initWeaponCount > 1) {
  console.log(`⚠️ Found ${initWeaponCount} initWeaponSystem functions, need to deduplicate`);
  // Keep only the first one, remove subsequent ones
  const parts = indexContent.split('function initWeaponSystem');
  if (parts.length > 2) {
    // Find the end of the second function and remove it
    const secondStart = indexContent.indexOf('function initWeaponSystem', indexContent.indexOf('function initWeaponSystem') + 1);
    const nextFunction = indexContent.indexOf('function ', secondStart + 1);
    if (nextFunction > secondStart) {
      const toRemove = indexContent.substring(secondStart, nextFunction);
      indexContent = indexContent.replace(toRemove, '');
    }
  }
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Fixed duplicate function declarations');
console.log('🔧 Renamed createMuzzleFlash to createWeaponMuzzleFlash');