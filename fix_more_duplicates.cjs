const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log(`⚠️ Pattern not found (skipping): ${oldStr.slice(0, 50)}...`);
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('🔧 FIXING: More duplicate function declarations');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Find and remove the old switchWeapon function (the simpler one)
const oldSwitchWeaponStart = indexContent.indexOf('function switchWeapon(weaponType) {');
if (oldSwitchWeaponStart > 0) {
  // Find the end of this function by looking for the next function declaration
  const nextFunctionStart = indexContent.indexOf('function ', oldSwitchWeaponStart + 1);
  
  if (nextFunctionStart > oldSwitchWeaponStart) {
    const oldFunction = indexContent.substring(oldSwitchWeaponStart, nextFunctionStart);
    console.log(`📝 Removing old switchWeapon function (${oldFunction.length} chars)`);
    indexContent = indexContent.replace(oldFunction, '');
  }
}

// Check for other potential duplicates by searching for common function names
const duplicateChecks = [
  'function getCurrentWeapon',
  'function updateWeaponUI',
  'function upgradeWeapon',
  'function unlockWeapon',
  'function addWeaponXP'
];

duplicateChecks.forEach(funcName => {
  const count = (indexContent.match(new RegExp(funcName, 'g')) || []).length;
  if (count > 1) {
    console.log(`⚠️ Found ${count} instances of ${funcName} - may need manual review`);
  }
});

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Removed duplicate switchWeapon function');
console.log('🔍 Checked for other duplicates');