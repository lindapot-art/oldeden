// Quick Fix - Add Missing Closing Brace
const fs = require('fs');

console.log('🔧 Adding missing closing brace...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// Count current braces
const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;

console.log(`Current braces: ${openBraces} open, ${closeBraces} close`);

if (openBraces === closeBraces) {
  console.log('✅ Braces are already balanced!');
  process.exit(0);
}

if (openBraces > closeBraces) {
  const missing = openBraces - closeBraces;
  console.log(`Adding ${missing} missing closing brace(s)...`);
  
  // Find a safe location to add the missing brace
  // Look for the last function definition and add it right before
  const lastFunctionIndex = content.lastIndexOf('function ');
  if (lastFunctionIndex === -1) {
    console.log('❌ Could not find safe location to add brace');
    process.exit(1);
  }
  
  // Find the line start before the last function
  let insertPoint = lastFunctionIndex;
  while (insertPoint > 0 && content[insertPoint - 1] !== '\n') {
    insertPoint--;
  }
  
  // Insert the missing closing brace with proper indentation
  const beforeInsert = content.substring(0, insertPoint);
  const afterInsert = content.substring(insertPoint);
  
  const missingBraces = '}\n'.repeat(missing);
  const fixedContent = beforeInsert + missingBraces + afterInsert;
  
  // Verify the fix
  const newOpenBraces = (fixedContent.match(/\{/g) || []).length;
  const newCloseBraces = (fixedContent.match(/\}/g) || []).length;
  
  console.log(`After fix: ${newOpenBraces} open, ${newCloseBraces} close`);
  
  if (newOpenBraces !== newCloseBraces) {
    console.log('❌ Fix did not work correctly');
    process.exit(1);
  }
  
  fs.writeFileSync(htmlPath, fixedContent);
  console.log('✅ Missing closing brace added successfully');
} else {
  console.log('❌ More close braces than open braces - this is a different issue');
  process.exit(1);
}