#!/usr/bin/env node
// 👑 THE KING'S BRACE FIXER
// Fix the JavaScript brace mismatch

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: FIXING JAVASCRIPT BRACE MISMATCH');
console.log('══════════════════════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function analyzeBraces(content) {
  const lines = content.split('\n');
  let braceBalance = 0;
  let inString = false;
  let inComment = false;
  let stringChar = null;
  let problemLines = [];
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let lineBalance = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prev = line[i-1] || '';
      const next = line[i+1] || '';
      
      // Handle string detection
      if (!inComment && (char === '"' || char === "'" || char === '`') && prev !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
      }
      
      // Handle comment detection
      if (!inString && char === '/' && next === '/') {
        inComment = true;
      } else if (!inString && char === '/' && next === '*') {
        inComment = true;
      } else if (inComment && char === '*' && next === '/') {
        inComment = false;
        i++; // skip the next '/'
      }
      
      // Count braces only outside strings and comments
      if (!inString && !inComment) {
        if (char === '{') {
          braceBalance++;
          lineBalance++;
        } else if (char === '}') {
          braceBalance--;
          lineBalance--;
        }
      }
    }
    
    // Reset comment flag at end of line for single-line comments
    if (inComment && !line.includes('*/')) {
      inComment = false;
    }
    
    // Track lines with negative balance (too many closing braces)
    if (lineBalance < 0) {
      problemLines.push({
        line: lineNum + 1,
        content: line.trim(),
        balance: lineBalance
      });
    }
  }
  
  return { braceBalance, problemLines };
}

function fixExtraClosingBraces(content) {
  const lines = content.split('\n');
  const analysis = analyzeBraces(content);
  
  console.log(`🔍 Brace balance: ${analysis.braceBalance}`);
  console.log(`🔍 Problem lines: ${analysis.problemLines.length}`);
  
  if (analysis.problemLines.length > 0) {
    console.log('📍 Lines with extra closing braces:');
    analysis.problemLines.forEach(problem => {
      console.log(`  Line ${problem.line}: ${problem.content} (balance: ${problem.balance})`);
    });
    
    // Remove extra closing braces from the end of problematic lines
    let extraClosingBraces = Math.abs(analysis.braceBalance);
    
    for (let i = analysis.problemLines.length - 1; i >= 0 && extraClosingBraces > 0; i--) {
      const problemLine = analysis.problemLines[i];
      const lineIndex = problemLine.line - 1;
      let line = lines[lineIndex];
      
      // Remove closing braces from the end of the line
      let braceCount = Math.abs(problemLine.balance);
      for (let j = 0; j < braceCount && extraClosingBraces > 0; j++) {
        const lastBraceIndex = line.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          line = line.substring(0, lastBraceIndex) + line.substring(lastBraceIndex + 1);
          extraClosingBraces--;
        }
      }
      
      lines[lineIndex] = line;
      console.log(`🔧 Fixed line ${problemLine.line}`);
    }
  }
  
  return lines.join('\n');
}

try {
  console.log('📖 Reading index.html...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  console.log('🔍 Analyzing brace structure...');
  const initialAnalysis = analyzeBraces(content);
  console.log(`Initial brace balance: ${initialAnalysis.braceBalance}`);
  
  if (initialAnalysis.braceBalance !== 0) {
    console.log('🔧 Fixing brace mismatch...');
    content = fixExtraClosingBraces(content);
    
    const finalAnalysis = analyzeBraces(content);
    console.log(`Final brace balance: ${finalAnalysis.braceBalance}`);
    
    if (finalAnalysis.braceBalance === 0) {
      console.log('💾 Saving fixed index.html...');
      fs.writeFileSync(indexPath, content);
      console.log('✅ Brace mismatch fixed successfully!');
    } else {
      console.log('❌ Still have brace mismatch, manual review needed');
    }
  } else {
    console.log('✅ No brace mismatch found');
  }
  
} catch (error) {
  console.error('❌ FIX FAILED:', error);
  process.exit(1);
}