#!/usr/bin/env node
// KING's Final Syntax Fix - Remove remaining 35 closing braces and 2 closing parentheses

const fs = require('fs');

console.log('👑 KING: Final syntax cleanup - removing remaining orphaned characters...');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    const lines = content.split('\n');
    
    console.log(`📄 File: ${lines.length} lines`);
    
    // Count current mismatches
    const openBraces = (content.split('{').length - 1);
    const closeBraces = (content.split('}').length - 1);
    const openParens = (content.split('(').length - 1);
    const closeParens = (content.split(')').length - 1);
    
    console.log(`Current: Braces ${openBraces}/${closeBraces} (+${closeBraces-openBraces}), Parens ${openParens}/${closeParens} (+${closeParens-openParens})`);
    
    const targetBraceRemoval = closeBraces - openBraces;
    const targetParenRemoval = closeParens - openParens;
    
    console.log(`🎯 Need to remove: ${targetBraceRemoval} closing braces, ${targetParenRemoval} closing parentheses`);
    
    let removedBraces = 0;
    let removedParens = 0;
    let modifiedLines = [...lines];
    
    // Strategy: Look for lines that are ONLY closing characters or clearly orphaned
    for (let i = modifiedLines.length - 1; i >= 0; i--) {
        const line = modifiedLines[i];
        const trimmed = line.trim();
        
        // Remove standalone closing braces
        if ((trimmed === '}' || trimmed === '};' || trimmed === '},') && removedBraces < targetBraceRemoval) {
            console.log(`Removing brace at line ${i + 1}: "${trimmed}"`);
            modifiedLines[i] = '';
            removedBraces++;
            continue;
        }
        
        // Remove standalone closing parentheses
        if ((trimmed === ')' || trimmed === ');' || trimmed === '),') && removedParens < targetParenRemoval) {
            console.log(`Removing paren at line ${i + 1}: "${trimmed}"`);
            modifiedLines[i] = '';
            removedParens++;
            continue;
        }
        
        // Look for lines with excessive closing characters
        const braceCount = (trimmed.match(/}/g) || []).length;
        const parenCount = (trimmed.match(/\)/g) || []).length;
        
        if (braceCount > 2 && removedBraces < targetBraceRemoval) {
            // Line has multiple closing braces, probably corrupted
            console.log(`Removing multi-brace line ${i + 1}: "${trimmed}"`);
            modifiedLines[i] = '';
            removedBraces += braceCount;
            continue;
        }
        
        if (parenCount > 3 && removedParens < targetParenRemoval) {
            // Line has multiple closing parens, probably corrupted
            console.log(`Removing multi-paren line ${i + 1}: "${trimmed}"`);
            modifiedLines[i] = '';
            removedParens += parenCount;
            continue;
        }
        
        // Stop when we've removed enough
        if (removedBraces >= targetBraceRemoval && removedParens >= targetParenRemoval) {
            break;
        }
    }
    
    // Clean up excessive empty lines
    const newContent = modifiedLines.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync('public/index.html', newContent, 'utf-8');
    
    // Verify the fix
    const newOpenBraces = (newContent.split('{').length - 1);
    const newCloseBraces = (newContent.split('}').length - 1);
    const newOpenParens = (newContent.split('(').length - 1);
    const newCloseParens = (newContent.split(')').length - 1);
    
    console.log(`Result: Braces ${newOpenBraces}/${newCloseBraces} (+${newCloseBraces-newOpenBraces}), Parens ${newOpenParens}/${newCloseParens} (+${newCloseParens-newOpenParens})`);
    console.log(`✅ Removed ${removedBraces} closing braces, ${removedParens} closing parentheses`);
    console.log('👑 KING: Final syntax cleanup complete');
    
} catch (error) {
    console.error('❌ Error during final cleanup:', error.message);
}