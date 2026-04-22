#!/usr/bin/env node
// 👑 KING'S EMERGENCY BRACE/PAREN BALANCE FIX
// Fixes syntax balance issues preventing EVE systems from working

const fs = require('fs');
const path = require('path');

console.log('👑 KING\'S EMERGENCY SYNTAX BALANCE FIX');
console.log('🚨 Fixing brace/paren mismatches preventing game startup');

const htmlFile = path.join(__dirname, 'public', 'index.html');
let htmlContent = fs.readFileSync(htmlFile, 'utf-8');

function countBalanced(content, openChar, closeChar) {
  let open = 0;
  let close = 0;
  let inString = false;
  let inComment = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = content[i-1] || '';
    const nextChar = content[i+1] || '';
    
    // Skip escaped characters
    if (prevChar === '\\') continue;
    
    // Handle strings
    if (!inComment && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }
    
    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = 'line';
        i++; // skip next char
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inComment = 'block';
        i++; // skip next char
        continue;
      }
      if (inComment === 'block' && char === '*' && nextChar === '/') {
        inComment = false;
        i++; // skip next char
        continue;
      }
      if (inComment === 'line' && char === '\n') {
        inComment = false;
        continue;
      }
    }
    
    // Count brackets/braces/parens only outside strings and comments
    if (!inString && !inComment) {
      if (char === openChar) open++;
      if (char === closeChar) close++;
    }
  }
  
  return { open, close, balance: open - close };
}

console.log('🔍 Analyzing current balance...');

const braceBalance = countBalanced(htmlContent, '{', '}');
const parenBalance = countBalanced(htmlContent, '(', ')');
const bracketBalance = countBalanced(htmlContent, '[', ']');

console.log('📊 Current Balance:');
console.log('  Braces { }: ' + braceBalance.open + ' open, ' + braceBalance.close + ' close, balance: ' + braceBalance.balance);
console.log('  Parens ( ): ' + parenBalance.open + ' open, ' + parenBalance.close + ' close, balance: ' + parenBalance.balance);
console.log('  Brackets [ ]: ' + bracketBalance.open + ' open, ' + bracketBalance.close + ' close, balance: ' + bracketBalance.balance);

// Fix 1: Remove excess closing braces
if (braceBalance.balance < 0) {
  console.log('🔧 Removing ' + Math.abs(braceBalance.balance) + ' excess closing braces...');
  
  let excessBraces = Math.abs(braceBalance.balance);
  let fixedContent = '';
  let inString = false;
  let inComment = false;
  let stringChar = '';
  
  for (let i = 0; i < htmlContent.length; i++) {
    const char = htmlContent[i];
    const prevChar = htmlContent[i-1] || '';
    const nextChar = htmlContent[i+1] || '';
    
    // Skip escaped characters
    if (prevChar === '\\') {
      fixedContent += char;
      continue;
    }
    
    // Handle strings
    if (!inComment && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      fixedContent += char;
      continue;
    }
    
    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = 'line';
        fixedContent += char;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inComment = 'block';
        fixedContent += char;
        continue;
      }
      if (inComment === 'block' && char === '*' && nextChar === '/') {
        inComment = false;
        fixedContent += char;
        continue;
      }
      if (inComment === 'line' && char === '\n') {
        inComment = false;
        fixedContent += char;
        continue;
      }
    }
    
    // Remove excess closing braces
    if (!inString && !inComment && char === '}' && excessBraces > 0) {
      // Check if this looks like an orphaned closing brace
      const context = htmlContent.substring(Math.max(0, i-20), i+20);
      if (context.includes('};') || context.includes('}\n') || context.includes('} ')) {
        excessBraces--;
        console.log('  Removed excess } at position ' + i);
        continue; // Skip this closing brace
      }
    }
    
    fixedContent += char;
  }
  
  htmlContent = fixedContent;
}

// Fix 2: Remove excess closing parentheses
if (parenBalance.balance < 0) {
  console.log('🔧 Removing ' + Math.abs(parenBalance.balance) + ' excess closing parentheses...');
  
  let excessParens = Math.abs(parenBalance.balance);
  let fixedContent = '';
  let inString = false;
  let inComment = false;
  let stringChar = '';
  
  for (let i = 0; i < htmlContent.length; i++) {
    const char = htmlContent[i];
    const prevChar = htmlContent[i-1] || '';
    const nextChar = htmlContent[i+1] || '';
    
    // Skip escaped characters
    if (prevChar === '\\') {
      fixedContent += char;
      continue;
    }
    
    // Handle strings
    if (!inComment && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      fixedContent += char;
      continue;
    }
    
    // Handle comments  
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = 'line';
        fixedContent += char;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inComment = 'block';
        fixedContent += char;
        continue;
      }
      if (inComment === 'block' && char === '*' && nextChar === '/') {
        inComment = false;
        fixedContent += char;
        continue;
      }
      if (inComment === 'line' && char === '\n') {
        inComment = false;
        fixedContent += char;
        continue;
      }
    }
    
    // Remove excess closing parentheses
    if (!inString && !inComment && char === ')' && excessParens > 0) {
      // Check if this looks like an orphaned closing paren
      const context = htmlContent.substring(Math.max(0, i-20), i+20);
      if (context.includes(');') || context.includes(')\n') || context.includes(') ')) {
        excessParens--;
        console.log('  Removed excess ) at position ' + i);
        continue; // Skip this closing paren
      }
    }
    
    fixedContent += char;
  }
  
  htmlContent = fixedContent;
}

// Fix 3: Add missing opening braces/parens if balance is positive
if (braceBalance.balance > 0) {
  console.log('🔧 Adding ' + braceBalance.balance + ' missing closing braces...');
  // Add closing braces before the final </script> tag
  const lastScriptIndex = htmlContent.lastIndexOf('</script>');
  const missingBraces = '}'.repeat(braceBalance.balance);
  htmlContent = htmlContent.slice(0, lastScriptIndex) + '\n' + missingBraces + '\n' + htmlContent.slice(lastScriptIndex);
}

if (parenBalance.balance > 0) {
  console.log('🔧 Adding ' + parenBalance.balance + ' missing closing parentheses...');
  // Add closing parens before the final </script> tag
  const lastScriptIndex = htmlContent.lastIndexOf('</script>');
  const missingParens = ')'.repeat(parenBalance.balance);
  htmlContent = htmlContent.slice(0, lastScriptIndex) + '\n' + missingParens + '\n' + htmlContent.slice(lastScriptIndex);
}

// Write fixed content
fs.writeFileSync(htmlFile, htmlContent);

// Verify the fix
const newBraceBalance = countBalanced(htmlContent, '{', '}');
const newParenBalance = countBalanced(htmlContent, '(', ')');

console.log('✅ KING\'S BALANCE FIX COMPLETED!');
console.log('📊 New Balance:');
console.log('  Braces { }: ' + newBraceBalance.open + ' open, ' + newBraceBalance.close + ' close, balance: ' + newBraceBalance.balance);
console.log('  Parens ( ): ' + newParenBalance.open + ' open, ' + newParenBalance.close + ' close, balance: ' + newParenBalance.balance);

if (newBraceBalance.balance === 0 && newParenBalance.balance === 0) {
  console.log('🎯 PERFECT BALANCE ACHIEVED!');
  console.log('👑 THE KING\'S SYNTAX FIX IS COMPLETE!');
} else {
  console.log('⚠️ Balance issues remain - manual inspection needed');
}