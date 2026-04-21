#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');

// Extract script block
const start = html.indexOf('<script type="module">');
const end = html.lastIndexOf('</script>');

if (start === -1 || end === -1) {
  console.error('[ERROR] Script block not found');
  process.exit(1);
}

const scriptContent = html.substring(start + 22, end);

// Write to temp file
const tmpFile = path.join(__dirname, '_tmp_check.mjs');
fs.writeFileSync(tmpFile, scriptContent, 'utf-8');

try {
  require('child_process').execSync(`node --check "${tmpFile}"`, { stdio: 'inherit' });
  console.log('\n[OK] Syntax check passed');
  fs.unlinkSync(tmpFile);
  process.exit(0);
} catch (e) {
  console.error('\n[ERROR] Syntax check failed');
  fs.unlinkSync(tmpFile);
  process.exit(1);
}
