#!/usr/bin/env node
// Fix syntax errors: remove 1 extra closing brace and 1 extra closing parenthesis

const fs = require('fs');
const path = require('path');

const cr = (text) => text.replace(/\n/g, '\r\n');
const safeReplace = (content, oldStr, newStr) => {
    const count = (content.match(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count === 0) {
        console.log(`❌ Pattern not found: ${oldStr}`);
        return content;
    }
    if (count > 1) {
        console.log(`⚠️ Multiple matches (${count}) for: ${oldStr}`);
    }
    return content.replace(oldStr, newStr);
};

console.log('🔧 KING: Fixing syntax errors in public/index.html...');

try {
    // Read the current file
    const content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines`);
    
    // Count current braces and parentheses
    const openBraces = (content.split('{').length - 1);
    const closeBraces = (content.split('}').length - 1);
    const openParens = (content.split('(').length - 1);
    const closeParens = (content.split(')').length - 1);
    
    console.log(`📊 Current counts:`);
    console.log(`   Braces: ${openBraces} open vs ${closeBraces} close (${closeBraces - openBraces > 0 ? '+' : ''}${closeBraces - openBraces})`);
    console.log(`   Parens: ${openParens} open vs ${closeParens} close (${closeParens - openParens > 0 ? '+' : ''}${closeParens - openParens})`);
    
    if (closeBraces === openBraces + 1 && closeParens === openParens + 1) {
        console.log('🎯 Confirmed: Need to remove 1 closing brace and 1 closing parenthesis');
        
        // Look for standalone closing braces and parentheses that might be extra
        let fixed = content;
        
        // Strategy 1: Look for lines with only whitespace + single } or )
        const lines = content.split('\n');
        let braceFixed = false;
        let parenFixed = false;
        
        // Find and remove the first standalone closing brace
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (!braceFixed && /^\s*}\s*$/.test(line)) {
                console.log(`🎯 Removing standalone closing brace at line ${i + 1}: "${line}"`);
                lines.splice(i, 1);
                braceFixed = true;
                break;
            }
        }
        
        // Find and remove the first standalone closing parenthesis (more flexible patterns)
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            // Look for standalone ) or ); or ).catch patterns
            if (!parenFixed && (/^\s*\)\s*$/.test(line) || /^\s*\);\s*$/.test(line) || /^\s*\)\./.test(line))) {
                console.log(`🎯 Removing standalone closing parenthesis at line ${i + 1}: "${line}"`);
                lines.splice(i, 1);
                parenFixed = true;
                break;
            }
        }
        
        // If still haven't found parens, look for lines ending with extra )
        if (!parenFixed) {
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.includes(')') && line.trim().endsWith(')')) {
                    // Check if this line might have an extra )
                    const openInLine = (line.split('(').length - 1);
                    const closeInLine = (line.split(')').length - 1);
                    if (closeInLine > openInLine) {
                        console.log(`🎯 Found line with extra ) at line ${i + 1}: "${line}"`);
                        // Remove one ) from the end
                        const lastParenIndex = line.lastIndexOf(')');
                        if (lastParenIndex > -1) {
                            lines[i] = line.substring(0, lastParenIndex) + line.substring(lastParenIndex + 1);
                            console.log(`🎯 Modified to: "${lines[i]}"`);
                            parenFixed = true;
                            break;
                        }
                    }
                }
            }
        }
        
        if (braceFixed && parenFixed) {
            fixed = lines.join('\n');
            
            // Verify the fix
            const newOpenBraces = (fixed.split('{').length - 1);
            const newCloseBraces = (fixed.split('}').length - 1);
            const newOpenParens = (fixed.split('(').length - 1);
            const newCloseParens = (fixed.split(')').length - 1);
            
            console.log(`✅ After fix:`);
            console.log(`   Braces: ${newOpenBraces} open vs ${newCloseBraces} close (${newCloseBraces - newOpenBraces === 0 ? 'BALANCED' : 'STILL UNBALANCED'})`);
            console.log(`   Parens: ${newOpenParens} open vs ${newCloseParens} close (${newCloseParens - newOpenParens === 0 ? 'BALANCED' : 'STILL UNBALANCED'})`);
            
            if (newCloseBraces === newOpenBraces && newCloseParens === newOpenParens) {
                // Write the fixed content
                fs.writeFileSync('public/index.html', cr(fixed));
                console.log(`🎉 SUCCESS: File fixed and saved`);
                console.log(`📊 Final: ${fixed.split('\n').length} lines`);
            } else {
                console.log(`❌ Fix didn't work, reverting`);
            }
        } else {
            console.log(`❌ Could not find standalone braces/parens to remove`);
        }
    } else {
        console.log(`❌ Unexpected syntax error pattern`);
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Syntax fix script complete');