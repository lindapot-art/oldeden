// Check line endings and indent style in server files
const fs = require('fs');
const files = [
  'src/core/index.js',
  'src/systems/EconomySystem.js',
  'src/persistence/FileStore.js',
  'src/server/AssetUploadRouter.js',
];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf-8');
  const hasCRLF = c.includes('\r\n');
  const hasLF = c.includes('\n') && !hasCRLF;
  const lines = c.split('\n');
  // Check first indent
  const firstIndent = lines.find(l => l.match(/^\s+\S/));
  const indentChar = firstIndent?.startsWith('\t') ? 'TAB' : 'SPACE';
  console.log(`${f}: ${hasCRLF?'CRLF':'LF'}, indent=${indentChar}, lines=${lines.length}`);
}
