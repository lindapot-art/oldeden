/**
 * Audit 44 — 4 bug fixes patch
 * 1. Docking fee never charged (B key sets docked=true before renderStation checks it)
 * 2. Save missing combat thresholds (_nextBossAt, _nextCycleAt, _nextBreatherAt)
 * 3. Ammo not restored to maxAmmo on load
 * 4. bossKills not saved in combat data
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
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

// Fix 1a: Docking fee never charged — B key handler
patch(
  'B-key: remove premature docked=true',
  "state.location.docked = true; AudioSFX.play('dock'); showScreen('station');\r\n    }\r\n    else addComms('System', 'No station in this system.');\r\n  }",
  "showScreen('station');\r\n    }\r\n    else addComms('System', 'No station in this system.');\r\n  }"
);

// Fix 1b: Docking fee never charged — action bar dock handler
patch(
  'action-bar dock: remove premature docked=true',
  "state.location.docked = true; AudioSFX.play('dock'); showScreen('station'); } else addComms('System', 'No station in this system.'); }",
  "showScreen('station'); } else addComms('System', 'No station in this system.'); }"
);

// Fix 2: Save combat thresholds + bossKills
patch(
  'saveGame: add combat thresholds + bossKills',
  "combat: { score: state.combat.score, kills: state.combat.kills, cycle: state.combat.cycle, bestStreak: state.combat.bestStreak || 0 },",
  "combat: { score: state.combat.score, kills: state.combat.kills, cycle: state.combat.cycle, bestStreak: state.combat.bestStreak || 0, bossKills: state.combat.bossKills || 0, _nextBossAt: state.combat._nextBossAt || 20, _nextCycleAt: state.combat._nextCycleAt || 15, _nextBreatherAt: state.combat._nextBreatherAt || 10 },"
);

// Fix 3: Restore combat thresholds + bossKills on load, and set ammo to maxAmmo
patch(
  'loadFromServerData: restore thresholds + ammo',
  "if (data.combat) { state.combat.score = data.combat.score || 0; state.combat.kills = data.combat.kills || 0; state.combat.cycle = data.combat.cycle || 1; state.combat.bestStreak = data.combat.bestStreak || 0; }",
  "if (data.combat) { state.combat.score = data.combat.score || 0; state.combat.kills = data.combat.kills || 0; state.combat.cycle = data.combat.cycle || 1; state.combat.bestStreak = data.combat.bestStreak || 0; state.combat.bossKills = data.combat.bossKills || 0; state.combat._nextBossAt = data.combat._nextBossAt || 20; state.combat._nextCycleAt = data.combat._nextCycleAt || 15; state.combat._nextBreatherAt = data.combat._nextBreatherAt || 10; }"
);

// Fix 3b: After applyUpgrades in loadFromServerData, set ammo to maxAmmo
patch(
  'loadFromServerData: ammo = maxAmmo after applyUpgrades',
  "applyUpgrades();\r\n}",
  "applyUpgrades();\r\n  state.combat.ammo = state.combat.maxAmmo;\r\n}"
);

if (applied === 5) {
  fs.writeFileSync(FILE, src, 'utf8');
  console.log(`\nAll 5 patches applied successfully. File written.`);
  process.exit(0);
} else {
  console.error(`\nOnly ${applied}/5 patches applied. File NOT written.`);
  process.exit(1);
}
