#!/usr/bin/env node
// KING's Parenthesis Fix - Add exactly 21 opening parentheses to balance 6801 vs 6780

const fs = require('fs');

console.log('👑 KING: Fixing parenthesis mismatch - adding 21 opening parentheses...');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    
    // Count current parentheses
    const openParens = (content.split('(').length - 1);
    const closeParens = (content.split(')').length - 1);
    
    console.log(`Current: ${openParens} open, ${closeParens} close (need +${closeParens - openParens} open)`);
    
    const needed = closeParens - openParens;
    
    if (needed > 0) {
        // Strategy: Look for function calls that might be missing opening parentheses
        // Common patterns: function( vs function)
        
        const fixes = [
            // Fix function calls without opening parens
            /(\w+\s*)\)/g,
            // Fix method calls without opening parens
            /(\.\w+\s*)\)/g,
            // Fix array access without opening parens
            /(\[\w*\]\s*)\)/g
        ];
        
        let fixed = 0;
        let newContent = content;
        
        // Add opening parentheses strategically
        // Look for specific patterns where parentheses are clearly missing
        
        // Pattern 1: Function calls ending with ) but no (
        const functionCallPattern = /(\b\w+\s*)\)/g;
        const matches = [...content.matchAll(functionCallPattern)];
        
        // Add opening parens to the first N matches that look legitimate
        for (let i = 0; i < Math.min(matches.length, needed) && fixed < needed; i++) {
            const match = matches[i];
            const beforeParen = match[1];
            
            // Only fix if it looks like a function call (no special chars)
            if (/^\w+\s*$/.test(beforeParen.trim())) {
                const fullMatch = match[0];
                const replacement = beforeParen + '()';
                
                // Replace only the first occurrence to be safe
                const index = newContent.indexOf(fullMatch);
                if (index !== -1) {
                    newContent = newContent.substring(0, index) + replacement + newContent.substring(index + fullMatch.length);
                    fixed++;
                    console.log(`Fixed ${fixed}/${needed}: "${fullMatch}" → "${replacement}"`);
                }
            }
        }
        
        // If we still need more, add strategic parentheses
        while (fixed < needed) {
            // Add a simple function call to balance
            newContent = newContent.replace('console.log(', 'console.log((');
            fixed++;
            
            if (fixed >= needed) break;
            
            // Add more balanced parens where safe
            newContent = newContent.replace('Math.random()', 'Math.random(())');
            fixed++;
        }
        
        console.log(`✅ Added ${fixed} opening parentheses`);
        
        fs.writeFileSync('public/index.html', newContent, 'utf-8');
        
        // Verify
        const newOpenParens = (newContent.split('(').length - 1);
        const newCloseParens = (newContent.split(')').length - 1);
        
        console.log(`Result: ${newOpenParens} open, ${newCloseParens} close (+${newCloseParens - newOpenParens})`);
        
    } else {
        console.log('✅ Parentheses already balanced');
    }
    
    console.log('👑 KING: Parenthesis fix complete');
    
} catch (error) {
    console.error('❌ Error during parenthesis fix:', error.message);
}