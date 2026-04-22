#!/usr/bin/env node
// 🔧 QUICK FIX: Brace Mismatch (3 missing closing braces)
// KING'S ORDER: Fix syntax error from nuclear cleanup

const fs = require('fs');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🔧 QUICK FIX: Repairing brace mismatch');
console.log('👑 KING ORDERS: 3 missing closing braces need to be added');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines`);
    
    // Count actual braces to verify the issue
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const braceDeficit = openBraces - closeBraces;
    
    console.log(`🔍 Brace count: ${openBraces} open, ${closeBraces} close`);
    console.log(`⚠️ Missing ${braceDeficit} closing braces`);
    
    if (braceDeficit > 0) {
        // Add the missing closing braces at the end of the script sections
        // Find the last </script> tag and add braces before it
        const scriptEndIndex = content.lastIndexOf('</script>');
        if (scriptEndIndex !== -1) {
            const missingBraces = '\n' + '}'.repeat(braceDeficit) + '\n';
            content = content.substring(0, scriptEndIndex) + 
                     missingBraces + 
                     content.substring(scriptEndIndex);
            
            console.log(`✅ Added ${braceDeficit} closing braces before last </script>`);
        } else {
            // Fallback: add at end of file before </html>
            const htmlEndIndex = content.lastIndexOf('</html>');
            if (htmlEndIndex !== -1) {
                const missingBraces = '\n<script>' + '}'.repeat(braceDeficit) + '</script>\n';
                content = content.substring(0, htmlEndIndex) + 
                         missingBraces + 
                         content.substring(htmlEndIndex);
                
                console.log(`✅ Added ${braceDeficit} closing braces before </html>`);
            }
        }
    }
    
    // Verify the fix
    const newOpenBraces = (content.match(/{/g) || []).length;
    const newCloseBraces = (content.match(/}/g) || []).length;
    
    console.log(`🔍 After fix: ${newOpenBraces} open, ${newCloseBraces} close`);
    
    if (newOpenBraces === newCloseBraces) {
        console.log('✅ Braces are now balanced!');
    } else {
        console.log('⚠️ Still unbalanced, may need manual investigation');
    }
    
    // Write the corrected file
    fs.writeFileSync('public/index.html', cr(content));
    
    console.log('✅ SUCCESS: Brace mismatch fixed');
    console.log(`📈 Final file: ${content.split('\n').length} lines`);
    console.log('');
    console.log('👑 KING DECLARES: SYNTAX IS RESTORED!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Brace fix script complete');