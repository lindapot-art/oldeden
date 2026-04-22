#!/usr/bin/env node
// 🚨 EMERGENCY DEBLOAT: Fix Massive File Bloat (779k lines -> normal)
// KING'S ORDER: Eliminate duplication and restore reasonable file size

const fs = require('fs');
const crypto = require('crypto');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🚨 EMERGENCY DEBLOAT: Fixing massive file bloat');
console.log('👑 KING ORDERS: Restore normal file size from 779k lines!');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines (${(content.length / 1024 / 1024).toFixed(2)}MB)`);
    
    const originalLines = content.split('\n');
    console.log('🔍 Analyzing file structure...');
    
    // Create hash-based deduplication
    const lineHashes = new Map();
    const deduplicatedLines = [];
    const duplicateStats = {};
    
    let removedCount = 0;
    
    for (let i = 0; i < originalLines.length; i++) {
        const line = originalLines[i];
        const trimmedLine = line.trim();
        
        // Skip completely empty lines - keep some but not excessive
        if (trimmedLine === '') {
            deduplicatedLines.push(line);
            continue;
        }
        
        // Create hash for line content (ignoring leading whitespace for similar lines)
        const lineHash = crypto.createHash('md5').update(trimmedLine).digest('hex');
        
        // Check if we've seen this exact content before
        if (lineHashes.has(lineHash)) {
            const firstOccurrence = lineHashes.get(lineHash);
            
            // Allow some repetition for valid HTML structures, but eliminate obvious duplication
            if (firstOccurrence.count < 5 || 
                trimmedLine.length < 20 || 
                trimmedLine.includes('<!DOCTYPE') ||
                trimmedLine.includes('<html') ||
                trimmedLine.includes('</html') ||
                trimmedLine.includes('<head') ||
                trimmedLine.includes('</head') ||
                trimmedLine.includes('<body') ||
                trimmedLine.includes('</body') ||
                trimmedLine.includes('<script') ||
                trimmedLine.includes('</script') ||
                trimmedLine.includes('<style') ||
                trimmedLine.includes('</style')) {
                
                firstOccurrence.count++;
                deduplicatedLines.push(line);
            } else {
                // This is likely a duplicate - track it
                removedCount++;
                if (!duplicateStats[trimmedLine.substring(0, 50)]) {
                    duplicateStats[trimmedLine.substring(0, 50)] = 0;
                }
                duplicateStats[trimmedLine.substring(0, 50)]++;
            }
        } else {
            // First time seeing this line
            lineHashes.set(lineHash, { index: i, count: 1 });
            deduplicatedLines.push(line);
        }
    }
    
    console.log(`🗑️ Removed ${removedCount} duplicate lines`);
    console.log('📊 Top duplicates removed:');
    
    const sortedDuplicates = Object.entries(duplicateStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedDuplicates.forEach(([content, count]) => {
        console.log(`  ${count}x: ${content}...`);
    });
    
    // Additional cleanup: remove obvious structural duplication patterns
    let cleanedContent = deduplicatedLines.join('\n');
    
    // Remove excessive repeated blocks (like repeated function definitions)
    const blockPatterns = [
        // Remove repeated function blocks
        /function\s+\w+\s*\([^)]*\)\s*{[^}]*}\s*function\s+\1\s*\([^)]*\)\s*{[^}]*}/g,
        // Remove repeated CSS blocks
        /([.#]\w+\s*{[^}]*})\s*\1/g,
        // Remove repeated HTML blocks
        /(<div[^>]*>[^<]*<\/div>)\s*\1/g
    ];
    
    let cleanupCount = 0;
    blockPatterns.forEach((pattern, index) => {
        const before = cleanedContent.length;
        cleanedContent = cleanedContent.replace(pattern, '$1');
        const after = cleanedContent.length;
        if (before > after) {
            cleanupCount++;
            console.log(`✅ Cleanup pattern ${index + 1}: Removed ${before - after} characters`);
        }
    });
    
    // Ensure we still have a valid HTML structure
    if (!cleanedContent.includes('<!DOCTYPE')) {
        throw new Error('File structure corrupted - DOCTYPE missing');
    }
    
    if (!cleanedContent.includes('</html>')) {
        throw new Error('File structure corrupted - HTML end tag missing');
    }
    
    // Write the debloated file
    fs.writeFileSync('public/index.html', cr(cleanedContent));
    
    const finalLines = cleanedContent.split('\n').length;
    const finalSize = (cleanedContent.length / 1024 / 1024).toFixed(2);
    const reductionPercent = ((originalLines.length - finalLines) / originalLines.length * 100).toFixed(1);
    
    console.log('✅ DEBLOAT SUCCESS:');
    console.log(`📉 Lines: ${originalLines.length} → ${finalLines} (-${reductionPercent}%)`);
    console.log(`📉 Size: ${(content.length / 1024 / 1024).toFixed(2)}MB → ${finalSize}MB`);
    console.log(`🎯 Removed: ${removedCount} duplicate lines + ${cleanupCount} block patterns`);
    console.log('');
    console.log('👑 KING DECLARES: FILE BLOAT ELIMINATED!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Debloat script complete');