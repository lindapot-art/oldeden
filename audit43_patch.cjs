/**
 * Audit 43 — 6 bug fixes patch
 * Uses exact string replacements on public/index.html
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const original = src;
let applied = 0;

function patch(name, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.error(`FAIL [${name}]: old string not found`);
    return false;
  }
  const count = src.split(oldStr).length - 1;
  if (count > 1) {
    console.error(`FAIL [${name}]: old string found ${count} times (expected 1)`);
    return false;
  }
  src = src.replace(oldStr, newStr);
  if (src.includes(newStr)) {
    console.log(`OK   [${name}]`);
    applied++;
    return true;
  }
  console.error(`FAIL [${name}]: replacement verification failed`);
  return false;
}

// Fix 1+2: bossActive and bossKills not reset on karma accept
patch(
  'karma-accept: reset bossActive+bossKills',
  'state.combat.dead = false;\r\n  state.chatbot.messages = [];',
  'state.combat.dead = false; state.combat.bossActive = false; state.combat.bossKills = 0;\r\n  state.chatbot.messages = [];'
);

// Fix 2b: bossKills not reset on rebirth:result
// The rebirth:result handler already resets bossActive (line 2010).
// Need to add bossKills = 0 after it.
patch(
  'rebirth:result: reset bossKills',
  'state.combat.bossActive = false;\r\n          state.inventory = [];',
  'state.combat.bossActive = false; state.combat.bossKills = 0;\r\n          state.inventory = [];'
);

// Fix 3: Settings back button should go to bridge if in-game, title if not
patch(
  'settings-back: conditional navigation',
  "document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('title'));",
  "document.getElementById('btn-settings-back').addEventListener('click', () => {\r\n  showScreen(state.player.name && state.player.faction ? 'bridge' : 'title');\r\n});"
);

// Fix 4: Weapon state not reset on gunner entry
patch(
  'enterGunnerMode: reset weapon state',
  'c.playerHasAttacked = false;\r\n  c.sessionStartTime = state.gameTime;',
  'c.playerHasAttacked = false;\r\n  c.weaponReady = true; c.charging = false; c.cooling = false; c.chargeLevel = 0; c._reloading = false;\r\n  c.sessionStartTime = state.gameTime;'
);

// Fix 5: Free reroll toast shows cost instead of FREE
patch(
  'reroll toast: show FREE when free',
  "showToast(`Re-rolled! (-${cost} SM)`);",
  "showToast(isFreeReroll ? 'Re-rolled! (FREE)' : `Re-rolled! (-${cost} SM)`);"
);

// Fix 6: storePastLife missing bossKills
patch(
  'storePastLife: add bossKills',
  'bestStreak: state.combat.bestStreak,\r\n    deathCause:',
  'bestStreak: state.combat.bestStreak,\r\n    bossKills: state.combat.bossKills || 0,\r\n    deathCause:'
);

if (applied === 6) {
  fs.writeFileSync(FILE, src, 'utf8');
  console.log(`\nAll 6 patches applied successfully. File written.`);
  process.exit(0);
} else {
  console.error(`\nOnly ${applied}/6 patches applied. File NOT written.`);
  process.exit(1);
}
