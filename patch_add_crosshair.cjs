// Add WoT crosshair HTML element manually

const fs = require('fs');

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

let htmlContent = fs.readFileSync('public/index.html', 'utf8');

// Add crosshair HTML after muzzle flash overlay
const htmlInsertPoint = `<div id="muzzle-flash-overlay"></div>`;

const crosshairHTML = `<div id="muzzle-flash-overlay"></div>
<!-- WoT-Style Direct Aiming Crosshair -->
<div id="wot-crosshair"></div>`;

htmlContent = safeReplace(htmlContent, htmlInsertPoint, crosshairHTML, 'WoT crosshair HTML element');

fs.writeFileSync('public/index.html', htmlContent);

console.log('✅ Crosshair HTML element added successfully!');