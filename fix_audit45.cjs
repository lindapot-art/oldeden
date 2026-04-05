/**
 * Audit 45 Patch — Market order auto-fill screen guard causes permanent loss
 * 
 * Bug: _placeOrder setTimeout has `if (state.screen !== _screenSnapshot) return;`
 *      which aborts the entire callback if the player navigates away from the market
 *      screen within 2-5 seconds. This means:
 *        - Buy orders: credits deducted but never refunded
 *        - Sell orders: items removed from cargo but never returned
 *        - Order stays in state.market.orders forever (no cancel mechanism)
 *        - Blocks NPC order regeneration (orders.length never reaches 0)
 *      
 * Fix: Remove the screen navigation guard. Keep rebirth/dead/alt-universe guards.
 *      Make the final renderMarketScreen() conditional on being on the market screen.
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

// Fix 1: Remove the _screenSnapshot variable declaration (no longer needed)
patch(
  '1-remove-screen-snapshot-var',
  `  const _rebirthSnapshot = state.player.rebirths;\r\n  const _screenSnapshot = state.screen;\r\n  const _altSnapshot = state.inAltUniverse;`,
  `  const _rebirthSnapshot = state.player.rebirths;\r\n  const _altSnapshot = state.inAltUniverse;`
);

// Fix 2: Remove the screen guard line inside setTimeout
patch(
  '2-remove-screen-guard',
  `    if (state.inAltUniverse !== _altSnapshot) return; // Guard: abort if dimension changed\r\n    if (state.screen !== _screenSnapshot) return; // Guard: abort if navigated away`,
  `    if (state.inAltUniverse !== _altSnapshot) return; // Guard: abort if dimension changed`
);

// Fix 3: Make renderMarketScreen() inside setTimeout conditional
patch(
  '3-conditional-market-rerender',
  `    }\r\n    renderMarketScreen();\r\n  }, 2000 + Math.random() * 3000);`,
  `    }\r\n    if (state.screen === 'market') renderMarketScreen();\r\n  }, 2000 + Math.random() * 3000);`
);

if (src === orig) {
  console.error('ERROR: No changes were made!');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nAll ${count} patches applied successfully.`);
