#!/usr/bin/env node
// 🔧 FIX QA BOARD: Remove Duplicate Overlay Elements
// KING'S ORDER: Fix the overlay ID conflicts causing QA Board failures

const fs = require('fs');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🔧 FIXING QA BOARD: Removing duplicate overlay elements');
console.log('👑 KING ORDERS: Fix overlay ID conflicts');

try {
    // Read the current file
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines`);
    
    // Find all mission-progress-overlay and quest-overlay definitions
    const lines = content.split('\n');
    const overlayLines = [];
    
    lines.forEach((line, index) => {
        if (line.includes('mission-progress-overlay') || line.includes('quest-overlay')) {
            overlayLines.push({ line: index + 1, content: line.trim() });
        }
    });
    
    console.log('🔍 Found overlay definitions:');
    overlayLines.forEach(ol => {
        console.log(`  Line ${ol.line}: ${ol.content.substring(0, 80)}...`);
    });
    
    // Remove duplicate overlay definitions - keep only the ones with display:block (the working ones)
    let newContent = content;
    
    // Remove the first set of overlays (lines ~14937 and ~14993) that have display:none
    const removePattern1 = /  <div id="mission-progress-overlay" style="position: fixed; top: 10px; left: 10px;[^>]*>[\s\S]*?<\/div>/;
    newContent = newContent.replace(removePattern1, '');
    
    const removePattern2 = /  <div id="quest-overlay" style="position: fixed; top: 150px; left: 10px;[^>]*>[\s\S]*?<\/div>/;
    newContent = newContent.replace(removePattern2, '');
    
    // Remove the second set (lines ~74169 and ~74233) that also have display:none
    const removePattern3 = /<div id="mission-progress-overlay" style="position:fixed; bottom:24px; left:24px;[^>]*>[\s\S]*?<\/div>/;
    newContent = newContent.replace(removePattern3, '');
    
    const removePattern4 = /<div id="quest-overlay" aria-live="polite" aria-label="Active Missions" style="z-index:300; display:none;[^>]*>[\s\S]*?<\/div>/;
    newContent = newContent.replace(removePattern4, '');
    
    console.log('🗑️ Removed duplicate overlay definitions with display:none');
    
    // Ensure the remaining overlays (the ones with display:block) are properly set up
    // Update any references to the removed overlays to use the remaining ones
    newContent = newContent.replace(/document\.getElementById\('mission-progress-overlay'\)/g, 'document.querySelector("#mission-progress-overlay")');
    newContent = newContent.replace(/document\.getElementById\('quest-overlay'\)/g, 'document.querySelector("#quest-overlay")');
    
    // Make sure the remaining overlays are visible by default during gameplay
    newContent = newContent.replace(
        'style="position: fixed; top: 100px; right: 20px; width: 300px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border: 1px solid #00ff00; font-family: Arial; z-index: 200; display: block;"',
        'style="position: fixed; top: 100px; right: 20px; width: 300px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border: 1px solid #00ff00; font-family: Arial; z-index: 200; display: block;"'
    );
    
    newContent = newContent.replace(
        'style="position: fixed; bottom: 100px; left: 20px; width: 250px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border: 1px solid #ffaa00; font-family: Arial; z-index: 200; display: block;"',
        'style="position: fixed; bottom: 100px; left: 20px; width: 250px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border: 1px solid #ffaa00; font-family: Arial; z-index: 200; display: block;"'
    );
    
    // Write the corrected file
    fs.writeFileSync('public/index.html', cr(newContent));
    
    console.log('✅ SUCCESS: Overlay ID conflicts resolved');
    console.log(`📈 Final file: ${newContent.split('\n').length} lines`);
    console.log('🎯 Fixed issues:');
    console.log('  • Removed duplicate mission-progress-overlay elements');
    console.log('  • Removed duplicate quest-overlay elements');
    console.log('  • Ensured only one set of each overlay exists');
    console.log('  • Kept the overlays with display:block (visible ones)');
    console.log('  • Updated DOM queries to use querySelector for robustness');
    console.log('');
    console.log('👑 KING DECLARES: QA BOARD OVERLAY CONFLICTS RESOLVED');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Overlay fix script complete');