const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
let applied = 0, failed = 0;

function cr(s) { return s.replace(/\n/g, '\r\n'); }
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr);
  if (!src.includes(o)) { console.error('MISS:', label); failed++; return; }
  const count = src.split(o).length - 1;
  if (count > 1) { console.error('MULTI(' + count + '):', label); failed++; return; }
  src = src.replace(o, cr(newStr));
  console.log('OK:', label);
  applied++;
}

// ─── Fix 4: First karma re-roll is free for first-lifers ───
safeReplace(
  'document.getElementById(\'btn-karma-reroll\').addEventListener(\'click\', () => {\n' +
  '  const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];\n' +
  '  if (state.player.stellarMarks < cost) {\n' +
  '    showToast(`Need $' + '{cost} SM to re-roll`);\n' +
  '    return;\n' +
  '  }\n' +
  '  state.player.stellarMarks -= cost;',

  'document.getElementById(\'btn-karma-reroll\').addEventListener(\'click\', () => {\n' +
  '  const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];\n' +
  '  // First death ever gets 1 free re-roll — new players have 0 SM\n' +
  '  const isFreeReroll = state.player.rebirths === 0 && state.karmaRerollCount === 0;\n' +
  '  if (!isFreeReroll && state.player.stellarMarks < cost) {\n' +
  '    showToast(`Need $' + '{cost} SM to re-roll`);\n' +
  '    return;\n' +
  '  }\n' +
  '  if (!isFreeReroll) state.player.stellarMarks -= cost;',
  'Fix4: First re-roll free for first-lifers'
);

// ─── Fix 5: Faction starting bonuses ───
safeReplace(
  '  if (factionObj) {\n' +
  '    state.factionRep[factionObj.id] = 100;\n' +
  '    addComms(\'AI Director\', `Welcome to $' + '{factionObj.home}, pilot $' + '{name}.`);\n' +
  '    addComms(factionObj.name, `The $' + '{factionObj.name} acknowledges your service.`);\n' +
  '  }',

  '  if (factionObj) {\n' +
  '    state.factionRep[factionObj.id] = 100;\n' +
  '    // Faction starting bonuses — meaningful choice\n' +
  '    const factionBonuses = {\n' +
  '      hegemony_vanguard: { stat: \'maxHull\', val: 25, label: \'+25 Max Hull\' },\n' +
  '      free_traders: { stat: \'credits\', val: 200, label: \'+200 Starting Credits\' },\n' +
  '      void_cult: { stat: \'maxShield\', val: 15, label: \'+15 Max Shield\' },\n' +
  '      iron_syndicate: { stat: \'railgunDmg\', val: 0.3, label: \'+0.3 Railgun Damage\' },\n' +
  '      eden_remnants: { stat: \'shieldRegen\', val: 1, label: \'+1 Shield Regen\' },\n' +
  '      stellar_church: { stat: \'engineSpeed\', val: 0.15, label: \'+0.15 Engine Speed\' },\n' +
  '      autonomous_collective: { stat: \'maxAmmo\', val: 8, label: \'+8 Max Ammo\' },\n' +
  '      rogue_ai_network: { stat: \'maxShield\', val: 10, label: \'+10 Max Shield\' },\n' +
  '    };\n' +
  '    const bonus = factionBonuses[factionObj.id];\n' +
  '    if (bonus) {\n' +
  '      if (bonus.stat === \'credits\') state.player.credits += bonus.val;\n' +
  '      else if (state.upgrades[bonus.stat] !== undefined) state.upgrades[bonus.stat] += bonus.val;\n' +
  '      addComms(factionObj.name, \'Faction bonus: \' + bonus.label);\n' +
  '    }\n' +
  '    addComms(\'AI Director\', `Welcome to $' + '{factionObj.home || \'the frontier\'}, pilot $' + '{name}.`);\n' +
  '    addComms(factionObj.name, `The $' + '{factionObj.name} acknowledges your service.`);\n' +
  '  }',
  'Fix5: Faction starting bonuses'
);

fs.writeFileSync(file, src, 'utf8');
console.log('\n=== AUDIT 25b RESULT: ' + applied + ' applied, ' + failed + ' failed ===');
const open = (src.match(/\{/g) || []).length;
const close = (src.match(/\}/g) || []).length;
console.log('Braces: { ' + open + ' } ' + close + ' delta=' + (open - close));
