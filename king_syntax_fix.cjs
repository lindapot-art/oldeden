#!/usr/bin/env node
// KING's Comprehensive Syntax Fix - Removes incomplete boss system causing 38+ extra closing braces

const fs = require('fs');

console.log('👑 KING: Comprehensive syntax fix - removing incomplete boss system...');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original: ${content.split('\n').length} lines`);
    
    // Count current syntax
    const openBraces = (content.split('{').length - 1);
    const closeBraces = (content.split('}').length - 1);
    const openParens = (content.split('(').length - 1);
    const closeParens = (content.split(')').length - 1);
    const openBrackets = (content.split('[').length - 1);
    const closeBrackets = (content.split(']').length - 1);
    
    console.log(`Before: Braces ${openBraces}/${closeBraces} (+${closeBraces-openBraces}), Parens ${openParens}/${closeParens} (+${closeParens-openParens}), Brackets ${openBrackets}/${closeBrackets} (+${closeBrackets-openBrackets})`);
    
    // Strategy: Remove large section of incomplete boss system
    // From after EVE systems until game loop
    
    // Find the EVE systems end marker
    const eveSystemsEnd = '// ═══ COMPREHENSIVE PROGRESSION SYSTEMS ═══';
    const gameLoopStart = 'function gameLoop() {';
    
    const eveEndIndex = content.indexOf(eveSystemsEnd);
    const gameLoopIndex = content.indexOf(gameLoopStart);
    
    if (eveEndIndex !== -1 && gameLoopIndex !== -1) {
        console.log(`🎯 Found EVE systems end at position ${eveEndIndex}`);
        console.log(`🎯 Found game loop start at position ${gameLoopIndex}`);
        
        // Replace the problematic section with minimal clean code
        const beforeSection = content.substring(0, eveEndIndex + eveSystemsEnd.length);
        const afterSection = content.substring(gameLoopIndex);
        
        // Insert clean transition code
        const cleanTransition = `

// ═══ GAME LOOP ═══

        `;
        
        content = beforeSection + cleanTransition + afterSection;
        
        console.log('✅ Replaced problematic boss system section');
    } else {
        console.log('❌ Could not find section markers, trying alternative approach');
        
        // Alternative: Remove specific boss system patterns
        const bossPatterns = [
            /^\s*activeBoss:\s*null,?\s*$/gm,
            /^\s*bossQueue:\s*\[\],?\s*$/gm,
            /^\s*lastBossSpawn:\s*\d+,?\s*$/gm,
            /^\s*spawnInterval:\s*\d+.*$/gm,
            /^\s*bossTypes:\s*\[.*$/gm,
            /^\s*name:\s*'[^']*',?\s*$/gm,
            /^\s*id:\s*'[^']*',?\s*$/gm,
            /^\s*hp:\s*\d+,?\s*$/gm,
            /^\s*maxHp:\s*\d+,?\s*$/gm,
            /^\s*damage:\s*\d+,?\s*$/gm
        ];
        
        let removeCount = 0;
        bossPatterns.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches) {
                content = content.replace(pattern, '');
                removeCount += matches.length;
                console.log(`  Pattern ${index + 1}: Removed ${matches.length} matches`);
            }
        });
        
        console.log(`✅ Removed ${removeCount} boss system patterns`);
    }
    
    // Clean up excessive empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write the fixed content
    fs.writeFileSync('public/index.html', content, 'utf-8');
    
    // Recount syntax
    const newOpenBraces = (content.split('{').length - 1);
    const newCloseBraces = (content.split('}').length - 1);
    const newOpenParens = (content.split('(').length - 1);
    const newCloseParens = (content.split(')').length - 1);
    const newOpenBrackets = (content.split('[').length - 1);
    const newCloseBrackets = (content.split(']').length - 1);
    
    console.log(`After: Braces ${newOpenBraces}/${newCloseBraces} (+${newCloseBraces-newOpenBraces}), Parens ${newOpenParens}/${newCloseParens} (+${newCloseParens-newOpenParens}), Brackets ${newOpenBrackets}/${newCloseBrackets} (+${newCloseBrackets-newOpenBrackets})`);
    console.log(`📄 Result: ${content.split('\n').length} lines`);
    
    const braceImprovement = (closeBraces - openBraces) - (newCloseBraces - newOpenBraces);
    const parenImprovement = (closeParens - openParens) - (newCloseParens - newOpenParens);
    
    console.log(`📊 Improvement: Fixed ${braceImprovement} braces, ${parenImprovement} parentheses`);
    console.log('👑 KING: Comprehensive syntax fix complete');
    
} catch (error) {
    console.error('❌ Error during syntax fix:', error.message);
}