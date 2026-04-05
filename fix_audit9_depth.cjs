/**
 * Audit 9 — Gameplay Depth Fixes
 * 
 * Fix 1: CRITICAL — Boss kills tracking: e.boss → e.isBoss + lifetimeStats.bossKills++
 * Fix 2: HIGH — Old-age death now calls playerDeathSequence() 
 * Fix 3: HIGH — Enemy difficulty scaling by rebirths + cycle
 * Fix 4: MEDIUM — Cycle counter double-increment guard
 * Fix 5: MEDIUM — Dedicated laser_fire SFX
 * Fix 6: MEDIUM — Dedicated reload SFX (replace quest_complete)
 * Fix 7: MEDIUM — Remove phantom pirateDodge/bossResist stats
 */
const fs = require('fs');
const PATH = 'public/index.html';

let src = fs.readFileSync(PATH, 'utf8');
let lines = src.split('\n');
function cr(s) { return s.endsWith('\r') ? s : s + '\r'; }
function findLine(content, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(content)) return i;
  }
  return -1;
}

let applied = 0;

// ═══════════════════════════════════════════════
// FIX 1a: Soul fragment boss kills — e.boss → e.isBoss
// ═══════════════════════════════════════════════
const bossFilterLine = findLine("e.boss && e.hp <= 0");
if (bossFilterLine >= 0) {
  lines[bossFilterLine] = lines[bossFilterLine].replace("e.boss && e.hp <= 0", "e.isBoss && e.hp <= 0");
  applied++;
  console.log(`[FIX 1a] Fixed e.boss → e.isBoss in soul fragment at line ${bossFilterLine + 1}`);
}

// ═══════════════════════════════════════════════
// FIX 1b: Track boss kills in lifetimeStats on boss kill
// ═══════════════════════════════════════════════
const bossKillLine = findLine("c.bossActive = false; addComms('AI Director', 'Boss destroyed!");
if (bossKillLine >= 0) {
  lines[bossKillLine] = lines[bossKillLine].replace(
    "if (e.isBoss) { c.bossActive = false;",
    "if (e.isBoss) { c.bossActive = false; state.player.lifetimeStats.bossKills++;"
  );
  applied++;
  console.log(`[FIX 1b] Added lifetimeStats.bossKills++ at line ${bossKillLine + 1}`);
}

// ═══════════════════════════════════════════════
// FIX 2: Old-age death uses playerDeathSequence()
// Replace the manual death path with a proper call
// ═══════════════════════════════════════════════
const oldAgeDeath = findLine("state.player.age >= 80 && !state.combat.dead");
if (oldAgeDeath >= 0) {
  // Find the block end — it's the closing } of the if block
  // The structure is:
  //   if (state.player.age >= 80 && ...) {
  //     state.combat.dead = true;
  //     state.combat.deathStats = ...;
  //     addComms('AI Director', ...);
  //     setTimeout(() => { ... }, 2000);
  //   }
  // Let me find the setTimeout closing and the if closing
  let blockEnd = -1;
  let braceCount = 0;
  for (let i = oldAgeDeath; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') braceCount++;
      if (ch === '}') { braceCount--; if (braceCount === 0) { blockEnd = i; break; } }
    }
    if (blockEnd >= 0) break;
  }
  if (blockEnd >= 0) {
    // Replace the entire if block content with a clean call to playerDeathSequence
    const newBlock = [
      "  if (state.player.age >= 80 && !state.combat.dead) {",
      "    playerDeathSequence('Died of old age at ' + Math.floor(state.player.age) + ' years');",
      "  }",
    ];
    lines.splice(oldAgeDeath, blockEnd - oldAgeDeath + 1, ...newBlock.map(cr));
    applied++;
    console.log(`[FIX 2] Replaced old-age death with playerDeathSequence() (was lines ${oldAgeDeath+1}-${blockEnd+1})`);
  }
}

// ═══════════════════════════════════════════════
// FIX 3: Enemy difficulty scaling by rebirths + cycle
// Modify createEnemy to scale HP and speed
// ═══════════════════════════════════════════════
const createEnemyLine = findLine("function createEnemy(type)");
if (createEnemyLine >= 0) {
  // Find the line that sets hp from config: "const hp = cfg.hp"
  const hpLine = findLine("const hp = cfg.hp", createEnemyLine);
  if (hpLine >= 0) {
    // Replace static hp with scaled hp
    lines[hpLine] = lines[hpLine].replace(
      "const hp = cfg.hp",
      "const diffScale = 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08; const hp = Math.ceil(cfg.hp * diffScale)"
    );
    applied++;
    console.log(`[FIX 3a] Added difficulty scaling for enemy HP at line ${hpLine + 1}`);
  } else {
    // Alternative: find where hp is used in the push call
    const pushLine = findLine("c.enemies.push({", createEnemyLine);
    if (pushLine >= 0 && lines[pushLine].includes("hp:")) {
      // Insert scaling before the push
      const scaleLine = "    const diffScale = 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08;";
      lines.splice(pushLine, 0, cr(scaleLine));
      // Now modify the hp in the push — find the actual push line (shifted by 1)
      const newPushLine = pushLine + 1;
      lines[newPushLine] = lines[newPushLine].replace(/hp:\s*cfg\.hp/g, "hp: Math.ceil(cfg.hp * diffScale)");
      lines[newPushLine] = lines[newPushLine].replace(/maxHp:\s*cfg\.hp/g, "maxHp: Math.ceil(cfg.hp * diffScale)");
      applied++;
      console.log(`[FIX 3a] Added difficulty scaling at enemy push (line ${pushLine + 1})`);
    }
  }
  
  // Scale enemy speed too
  const speedLine = findLine("speed: ENEMY_SPEED", createEnemyLine);
  if (speedLine >= 0) {
    lines[speedLine] = lines[speedLine].replace(
      /speed:\s*ENEMY_SPEED\s*\*\s*cfg\.speed/,
      "speed: ENEMY_SPEED * cfg.speed * (1 + (state.player.rebirths || 0) * 0.05)"
    );
    applied++;
    console.log(`[FIX 3b] Added speed scaling at line ${speedLine + 1}`);
  }
}

// ═══════════════════════════════════════════════
// FIX 4: Cycle counter double-increment guard
// ═══════════════════════════════════════════════
const cycleIncrLine = findLine("c.kills % 15 === 0");
if (cycleIncrLine >= 0) {
  lines[cycleIncrLine] = lines[cycleIncrLine].replace(
    "if (c.kills > 0 && c.kills % 15 === 0)",
    "if (c.kills > 0 && c.kills % 15 === 0 && c.kills !== c._lastCycleKills)"
  );
  // Add the tracking variable update inside the block
  lines[cycleIncrLine] = lines[cycleIncrLine].replace(
    "{ c.cycle++;",
    "{ c._lastCycleKills = c.kills; c.cycle++;"
  );
  applied++;
  console.log(`[FIX 4] Added cycle double-increment guard at line ${cycleIncrLine + 1}`);
}

// ═══════════════════════════════════════════════
// FIX 5: Dedicated laser_fire + reload SFX
// Add new SFX types to the AudioSFX switch block
// ═══════════════════════════════════════════════
const warpArriveCase = findLine("case 'warp_arrive':");
if (warpArriveCase >= 0) {
  // Find the break; after warp_arrive
  const warpBreak = findLine("break;", warpArriveCase);
  if (warpBreak >= 0) {
    const newSfx = [
      "      case 'laser_fire': osc.type='sawtooth'; osc.frequency.setValueAtTime(1200,now); osc.frequency.exponentialRampToValueAtTime(3000,now+0.06); gain.gain.setValueAtTime(0.07*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.08); osc.start(now); osc.stop(now+0.08); break;",
      "      case 'reload': { osc.disconnect(); const dur3=0.15; const buf3=ctx.createBuffer(1,ctx.sampleRate*dur3,ctx.sampleRate); const d3=buf3.getChannelData(0); for(let i=0;i<d3.length;i++) d3[i]=(Math.random()*2-1)*(1-i/d3.length)*0.5; const src3=ctx.createBufferSource(); src3.buffer=buf3; const lp3=ctx.createBiquadFilter(); lp3.type='lowpass'; lp3.frequency.value=400; src3.connect(lp3); lp3.connect(gain); gain.gain.setValueAtTime(0.12*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur3); src3.start(now); return; }",
    ];
    lines.splice(warpBreak + 1, 0, ...newSfx.map(cr));
    applied++;
    console.log(`[FIX 5] Added laser_fire + reload SFX after warp_arrive`);
  }
}

// ═══════════════════════════════════════════════
// FIX 5b: Replace laser placeholder SFX
// ═══════════════════════════════════════════════
const laserPlaceholder = findLine("AudioSFX.play('hit'); // use hit sound as placeholder for laser");
if (laserPlaceholder >= 0) {
  lines[laserPlaceholder] = lines[laserPlaceholder].replace(
    "AudioSFX.play('hit'); // use hit sound as placeholder for laser",
    "AudioSFX.play('laser_fire');"
  );
  applied++;
  console.log(`[FIX 5b] Replaced laser placeholder with laser_fire SFX at line ${laserPlaceholder + 1}`);
}

// ═══════════════════════════════════════════════
// FIX 6: Replace reload quest_complete with reload SFX
// ═══════════════════════════════════════════════
// Find all occurrences of reload playing quest_complete
let reloadFixCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("AudioSFX.play('quest_complete')") && lines[i].includes("Ammo replenished")) {
    lines[i] = lines[i].replace("AudioSFX.play('quest_complete')", "AudioSFX.play('reload')");
    reloadFixCount++;
  }
}
if (reloadFixCount > 0) {
  applied++;
  console.log(`[FIX 6] Replaced ${reloadFixCount}x reload quest_complete with reload SFX`);
}

// ═══════════════════════════════════════════════
// FIX 7: Remove phantom pirateDodge/bossResist from soulMemory
// ═══════════════════════════════════════════════
const pirateDodgeLine = findLine("pirateDodge:");
if (pirateDodgeLine >= 0 && lines[pirateDodgeLine].includes("pirateDodge:")) {
  // Remove the pirateDodge line
  lines.splice(pirateDodgeLine, 1);
  // Find bossResist (now shifted up by 1)
  const bossResistLine = findLine("bossResist:");
  if (bossResistLine >= 0 && lines[bossResistLine].includes("bossResist:")) {
    lines.splice(bossResistLine, 1);
    applied++;
    console.log(`[FIX 7] Removed phantom pirateDodge + bossResist stats`);
  }
}

// Also remove from loadFromServerData if present
const loadPirate = findLine("pirateDodge", findLine("function loadFromServerData"));
if (loadPirate >= 0 && lines[loadPirate].includes("pirateDodge")) {
  // Just remove the assignment lines — check what the line looks like
  if (lines[loadPirate].includes("if (!state.player.soulMemory.pirateDodge")) {
    lines.splice(loadPirate, 1);
    const loadBoss = findLine("bossResist", loadPirate > 0 ? loadPirate - 1 : 0);
    if (loadBoss >= 0 && lines[loadBoss].includes("bossResist")) {
      lines.splice(loadBoss, 1);
    }
    console.log(`[FIX 7b] Cleaned up phantom stats from loadFromServerData`);
  }
}

// ═══════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════
const RX = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/.*$/gm;
function countBalance(text) {
  let b = 0, p = 0;
  const s = text.replace(RX, '');
  for (const ch of s) { if (ch === '{') b++; else if (ch === '}') b--; else if (ch === '(') p++; else if (ch === ')') p--; }
  return { b, p };
}
const orig = countBalance(src);
const out = lines.join('\n');
const now = countBalance(out);
console.log(`\nApplied: ${applied} fixes`);
console.log(`Balance delta — Braces: ${now.b - orig.b}  Parens: ${now.p - orig.p}  Lines: ${lines.length}`);
if (now.b !== orig.b || now.p !== orig.p) {
  console.error('BALANCE CHANGED — NOT WRITING FILE');
  process.exit(1);
}
fs.writeFileSync(PATH, out, 'utf8');
console.log('File written successfully.');
