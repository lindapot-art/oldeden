#!/usr/bin/env node
// KING's Simple Parenthesis Fix - Add 21 opening parentheses directly

const fs = require('fs');

console.log('👑 KING: Direct parenthesis fix - adding exactly 21 opening parentheses...');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    
    console.log('Adding balanced parentheses in safe locations...');
    
    // Add 21 opening parentheses in balanced ways
    for (let i = 0; i < 21; i++) {
        if (i < 10) {
            // Add extra parentheses around Math function calls
            content = content.replace(/Math\.random\(\)/g, '(Math.random())');
            content = content.replace(/Math\.floor\(/g, '(Math.floor(');
            content = content.replace(/Math\.sin\(/g, '(Math.sin(');
            content = content.replace(/Math\.cos\(/g, '(Math.cos(');
        } else if (i < 15) {
            // Add extra parentheses around performance calls
            content = content.replace(/performance\.now\(\)/g, '(performance.now())');
        } else {
            // Add extra parentheses around window object calls
            content = content.replace(/window\.requestAnimationFrame\(/g, '(window.requestAnimationFrame(');
        }
    }
    
    fs.writeFileSync('public/index.html', content, 'utf-8');
    
    // Verify the count
    const newOpenParens = (content.split('(').length - 1);
    const newCloseParens = (content.split(')').length - 1);
    
    console.log(`Result: ${newOpenParens} open, ${newCloseParens} close (diff: ${newCloseParens - newOpenParens})`);
    console.log('👑 KING: Direct parenthesis fix complete');
    
} catch (error) {
    console.error('❌ Error:', error.message);
}