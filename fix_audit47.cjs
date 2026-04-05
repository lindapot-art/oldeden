/**
 * Audit 47 Patch — R key reload plays wrong SFX
 * 
 * Bug: R key reload handler plays 'quest_complete' SFX instead of 'reload'
 *   - The action bar reload and mobile touch reload both correctly play 'reload'
 *   - Only the R key path plays the wrong sound
 * Fix: Change 'quest_complete' to 'reload' in the R key reload setTimeout
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const orig = src;
let count = 0;

function patch(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.error(`PATCH FAILED [${label}]: old string not found`);
    process.exit(1);
  }
  const occurrences = src.split(oldStr).length - 1;
  if (occurrences !== 1) {
    console.error(`PATCH FAILED [${label}]: expected 1 occurrence, found ${occurrences}`);
    process.exit(1);
  }
  src = src.replace(oldStr, newStr);
  count++;
  console.log(`PATCH OK [${label}]`);
}

// Fix: R key reload uses wrong SFX
patch(
  '1-r-key-reload-sfx',
  `        c._reloading = false;\r\n        if (!c.active || c.dead) return;\r\n        c.ammo = c.maxAmmo;\r\n        c.weaponReady = true;\r\n        AudioSFX.play('quest_complete');\r\n        addComms('System', 'Ammo replenished.');`,
  `        c._reloading = false;\r\n        if (!c.active || c.dead) return;\r\n        c.ammo = c.maxAmmo;\r\n        c.weaponReady = true;\r\n        AudioSFX.play('reload');\r\n        addComms('System', 'Ammo replenished.');`
);

if (src === orig) {
  console.error('ERROR: No changes were made!');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nAll ${count} patches applied successfully.`);
