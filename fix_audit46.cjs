/**
 * Audit 46 Patch — Market orders not cleared on rebirth + rebirth:result missing resets
 * 
 * Bug 1 (MEDIUM): Market orders not cleared on rebirth (karma-accept handler)
 *   - On rebirth, inventory/quests/upgrades are reset but state.market.orders is not
 *   - Stale NPC orders and orphaned player orders persist across lives
 *   - Blocks NPC order regeneration (orders.length never reaches 0)
 *   Fix: Add state.market.orders = [] in karma-accept handler
 * 
 * Bug 2 (MEDIUM): rebirth:result handler missing critical state resets
 *   - Combat thresholds (_nextCycleAt, _nextBossAt, _nextBreatherAt) not reset
 *   - Skills not reset
 *   - Chatbot messages not cleared
 *   - Market orders not cleared
 *   Fix: Add missing resets to match karma-accept handler
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

// Fix 1: Clear market orders on karma-accept rebirth
patch(
  '1-karma-accept-clear-market-orders',
  `  state.quests = state.quests.filter(q => !q.active);\r\n  // Restore original universe if player died in alt universe`,
  `  state.quests = state.quests.filter(q => !q.active);\r\n  state.market.orders = []; // Clear stale orders from previous life\r\n  // Restore original universe if player died in alt universe`
);

// Fix 2: Add missing resets to rebirth:result handler
patch(
  '2-rebirth-result-add-missing-resets',
  `          state.combat.bossActive = false; state.combat.bossKills = 0;\r\n          state.inventory = [];\r\n          state.quests = state.quests.filter(q => !q.active);`,
  `          state.combat.bossActive = false; state.combat.bossKills = 0;\r\n          state.combat.dead = false;\r\n          state.combat._nextCycleAt = 15; state.combat._nextBossAt = 20; state.combat._nextBreatherAt = 10; state.combat._breatherStart = 0;\r\n          state.chatbot.messages = [];\r\n          resetSkills();\r\n          state.inventory = [];\r\n          state.quests = state.quests.filter(q => !q.active);\r\n          state.market.orders = []; // Clear stale orders from previous life`
);

if (src === orig) {
  console.error('ERROR: No changes were made!');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nAll ${count} patches applied successfully.`);
