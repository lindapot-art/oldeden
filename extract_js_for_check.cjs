const fs = require('fs');

console.log('🔍 Extracting JavaScript from index.html for syntax checking...');

try {
  const html = fs.readFileSync('public/index.html', 'utf8');
  
  // Find the main script section
  const scriptStart = html.indexOf('<script type="module">');
  const scriptEnd = html.lastIndexOf('</script>');
  
  if (scriptStart === -1 || scriptEnd === -1) {
    console.error('❌ Could not find script tags');
    process.exit(1);
  }
  
  const scriptContent = html.substring(scriptStart + 22, scriptEnd);
  fs.writeFileSync('_temp_syntax_check.mjs', scriptContent);
  
  console.log('✅ JavaScript extracted to _temp_syntax_check.mjs');
  console.log(`📏 Script size: ${scriptContent.length} characters`);
  
} catch(error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}