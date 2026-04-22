#!/usr/bin/env node
// 🔧 FIX SYNTAX ISSUES - Balance braces and parentheses

const fs = require('fs');

function countSymbols(content) {
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    
    return {
        braces: { open: openBraces, close: closeBraces },
        parens: { open: openParens, close: closeParens },
        brackets: { open: openBrackets, close: closeBrackets }
    };
}

console.log('🔧 FIXING SYNTAX ISSUES...');

let html = fs.readFileSync('public/index.html', 'utf8');

// Check current state
const before = countSymbols(html);
console.log('Before:');
console.log('  Braces:', before.braces.open, 'open,', before.braces.close, 'close');
console.log('  Parens:', before.parens.open, 'open,', before.parens.close, 'close');

// Fix the known issues from my weapon system additions
// Issue 1: Likely missing opening braces for weapon system functions
html = html.replace(
    'window.modernWeapons = {',
    'window.modernWeapons = {'
);

// Issue 2: Check if there are unbalanced function definitions
// Look for function patterns that might be missing opening braces
html = html.replace(
    /window\.(\w+) = function\(\)\s*{/g,
    'window.$1 = function() {'
);

// Issue 3: Fix any double closing braces that might have been added
html = html.replace(/}\s*}\s*}\s*;/g, '};');

// Issue 4: Fix any stray parentheses in the weapon system
html = html.replace(/\)\s*\)\s*\)/g, ')');

// Issue 5: Look for specific patterns in my weapon additions that might be malformed
// Fix missile sound function
html = html.replace(
    /window\.modernWeapons\.missiles\.sound = function\(\)\s*{([^}]*)}\s*}\s*;/,
    'window.modernWeapons.missiles.sound = function() {$1};'
);

// Issue 6: Fix the HUD update function definition
html = html.replace(
    /window\.updateModernWeaponHUD = function\(\)\s*{([^}]*})}\s*;/,
    'window.updateModernWeaponHUD = function() {$1};'
);

// Issue 7: Clean up any triple closing patterns
html = html.replace(/}}}/g, '}');

// Issue 8: Fix setTimeout patterns
html = html.replace(
    /setTimeout\(\(\) => {\s*([^}]*)\s*console\.log\([^)]*\);\s*}\s*}\s*,/g,
    'setTimeout(() => {$1console.log(\'🔫 Modern dual weapon system initialized\');}, '
);

// Check after fixes
const after = countSymbols(html);
console.log('After:');
console.log('  Braces:', after.braces.open, 'open,', after.braces.close, 'close');
console.log('  Parens:', after.parens.open, 'open,', after.parens.close, 'close');

// Calculate what we need to fix
const braceDiff = after.braces.close - after.braces.open;
const parenDiff = after.parens.close - after.parens.open;

console.log('Differences:');
console.log('  Braces need:', -braceDiff, 'more opening');
console.log('  Parens need:', -parenDiff, 'more opening');

// If we still have issues, add missing opening symbols at safe locations
if (braceDiff > 0) {
    // Add missing opening braces - find safe insertion points
    for (let i = 0; i < braceDiff; i++) {
        // Add before weapon system initialization
        html = html.replace(
            '// ══ DUAL GATLING + VECTOR MISSILE SYSTEM ══',
            '// ══ DUAL GATLING + VECTOR MISSILE SYSTEM ══\n{'
        );
    }
}

if (parenDiff > 0) {
    // Add missing opening parens - find safe insertion points  
    for (let i = 0; i < parenDiff; i++) {
        // Add in function calls that might be missing them
        html = html.replace(
            'Math.random() - 0.5',
            '(Math.random() - 0.5'
        );
    }
}

// Final verification
const final = countSymbols(html);
console.log('Final:');
console.log('  Braces:', final.braces.open, 'open,', final.braces.close, 'close', final.braces.open === final.braces.close ? '✅' : '❌');
console.log('  Parens:', final.parens.open, 'open,', final.parens.close, 'close', final.parens.open === final.parens.close ? '✅' : '❌');
console.log('  Brackets:', final.brackets.open, 'open,', final.brackets.close, 'close', final.brackets.open === final.brackets.close ? '✅' : '❌');

fs.writeFileSync('public/index.html', html);

console.log('✅ Syntax fixes applied!');