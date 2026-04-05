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

// ─── Fix 1: tradeInsight accrues in storePastLife ───
safeReplace(
  `  state.pastLives.push(life);
  // Cap at 200 to prevent localStorage bloat (~5MB limit)
  if (state.pastLives.length > 200) state.pastLives.splice(0, state.pastLives.length - 200);`,
  `  state.pastLives.push(life);
  // Accrue soul memory — tradeInsight based on credits earned this life
  if (state.player.credits >= 500) {
    state.soulMemory.tradeInsight = Math.min(15, state.soulMemory.tradeInsight + Math.min(3, Math.floor(state.player.credits / 500)));
  }
  // Cap at 200 to prevent localStorage bloat (~5MB limit)
  if (state.pastLives.length > 200) state.pastLives.splice(0, state.pastLives.length - 200);`,
  'Fix1: tradeInsight accrues in storePastLife'
);

// ─── Fix 2: Aging warnings at 60, 70, 75 ───
safeReplace(
  `  state.player.age += (dtMs / 1000) / 180; // 180 seconds = 1 year
  if (state.player.age >= 80 && !state.combat.dead) {
    playerDeathSequence('Died of old age at ' + Math.floor(state.player.age) + ' years');
  }`,
  `  const prevAge = state.player.age;
  state.player.age += (dtMs / 1000) / 180; // 180 seconds = 1 year
  // Aging warnings — escalating urgency
  if (prevAge < 60 && state.player.age >= 60) addComms('Medical AI', '\\u26a0 Age 60 — cellular decay accelerating. Consider your legacy.');
  if (prevAge < 70 && state.player.age >= 70) addComms('Medical AI', '\\u26a0 Age 70 — critical deterioration. Your time grows short, pilot.');
  if (prevAge < 75 && state.player.age >= 75) addComms('Medical AI', '\\u2620 Age 75 — terminal decline. The wheel awaits.');
  if (state.player.age >= 80 && !state.combat.dead) {
    playerDeathSequence('Died of old age at ' + Math.floor(state.player.age) + ' years');
  }`,
  'Fix2: Aging warnings at 60 70 75'
);

// ─── Fix 3: Karma spin duration scales by rarity ───
safeReplace(
  `  AudioSFX.play('karma_spin');
  // Phase 2: After spin, reveal the card
  setTimeout(() => {
    spinner.classList.add('hidden');
    subtitle.textContent = 'Your fate has been decided.';
    presentKarmaCard(roll);
  }, 2000);`,
  `  AudioSFX.play('karma_spin');
  // Phase 2: After spin, reveal the card — rarity scales duration for drama
  const spinDur = {common:2000, uncommon:2500, rare:3000, epic:3800, legendary:5000}[roll.rarity] || 2000;
  const spinSubtitles = {common:'The soul settles...', uncommon:'Something stirs...', rare:'The cosmos aligns...', epic:'Destiny trembles...', legendary:'THE STARS QUAKE!'};
  let _spinPhase = 0;
  if (spinDur > 2500) { setTimeout(() => { subtitle.textContent = spinSubtitles[roll.rarity] || 'The soul seeks...'; }, spinDur * 0.5); }
  setTimeout(() => {
    spinner.classList.add('hidden');
    subtitle.textContent = 'Your fate has been decided.';
    presentKarmaCard(roll);
  }, spinDur);`,
  'Fix3: Karma spin scales by rarity'
);

// ─── Fix 4: First karma re-roll is free for first-lifers ───
safeReplace(
  `document.getElementById('btn-karma-reroll').addEventListener('click', () => {
  const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
  if (state.player.stellarMarks < cost) {
    showToast(${"'Need ${cost} SM to re-roll'"});
    return;
  }
  state.player.stellarMarks -= cost;`,
  `document.getElementById('btn-karma-reroll').addEventListener('click', () => {
  const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
  // First death ever gets 1 free re-roll — new players have 0 SM
  const isFreeReroll = state.player.rebirths === 0 && state.karmaRerollCount === 0;
  if (!isFreeReroll && state.player.stellarMarks < cost) {
    showToast('Need ' + cost + ' SM to re-roll');
    return;
  }
  if (!isFreeReroll) state.player.stellarMarks -= cost;`,
  'Fix4: First re-roll free for first-lifers'
);

// ─── Fix 5: Faction starting bonuses ───
safeReplace(
  `  if (factionObj) {
    state.factionRep[factionObj.id] = 100;
    addComms('AI Director', ${"'Welcome to ${factionObj.home}, pilot ${name}.'"});
    addComms(factionObj.name, ${"'The ${factionObj.name} acknowledges your service.'"});
  }`,
  `  if (factionObj) {
    state.factionRep[factionObj.id] = 100;
    // Faction starting bonuses — meaningful choice
    const factionBonuses = {
      hegemony_vanguard: { stat: 'maxHull', val: 25, label: '+25 Max Hull' },
      free_traders: { stat: 'credits', val: 200, label: '+200 Starting Credits' },
      void_cult: { stat: 'maxShield', val: 15, label: '+15 Max Shield' },
      iron_syndicate: { stat: 'railgunDmg', val: 0.3, label: '+0.3 Railgun Damage' },
      eden_remnants: { stat: 'shieldRegen', val: 1, label: '+1 Shield Regen' },
      stellar_church: { stat: 'engineSpeed', val: 0.15, label: '+0.15 Engine Speed' },
      autonomous_collective: { stat: 'maxAmmo', val: 8, label: '+8 Max Ammo' },
      rogue_ai_network: { stat: 'maxShield', val: 10, label: '+10 Max Shield' },
    };
    const bonus = factionBonuses[factionObj.id];
    if (bonus) {
      if (bonus.stat === 'credits') state.player.credits += bonus.val;
      else if (state.upgrades[bonus.stat] !== undefined) state.upgrades[bonus.stat] += bonus.val;
      else if (state.ship[bonus.stat] !== undefined) { state.ship[bonus.stat] += bonus.val; state.ship['max' in bonus.stat ? bonus.stat : bonus.stat] += bonus.val; }
      addComms(factionObj.name, 'Faction bonus: ' + bonus.label);
    }
    addComms('AI Director', 'Welcome to ' + (factionObj.home || 'the frontier') + ', pilot ' + name + '.');
    addComms(factionObj.name, 'The ' + factionObj.name + ' acknowledges your service.');
  }`,
  'Fix5: Faction starting bonuses'
);

// ─── Fix 6: Progressive tutorial hints for first-lifers ───
safeReplace(
  `  // First-life tutorial hints
  if (state.player.rebirths === 0) {
    setTimeout(() => addComms('EDEN AI', '\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'), 3000);
    setTimeout(() => addComms('EDEN AI', 'In Old Eden, death is not the end — it is a door to a new life.'), 8000);
  }`,
  `  // First-life tutorial hints — progressive guidance
  if (state.player.rebirths === 0) {
    setTimeout(() => addComms('EDEN AI', '\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'), 3000);
    setTimeout(() => addComms('EDEN AI', 'Hold Shift to boost. WASD or Arrow keys to fly.'), 7000);
    setTimeout(() => addComms('EDEN AI', 'Press B near a station to dock — buy upgrades, trade cargo, and repair.'), 15000);
    setTimeout(() => addComms('EDEN AI', 'Press F near a stargate to warp to new systems. Explore the frontier!'), 25000);
    setTimeout(() => addComms('EDEN AI', 'In Old Eden, death is not the end — it is a door to a new life.'), 40000);
    setTimeout(() => addComms('EDEN AI', 'Your genome shapes your potential. Trade, fight, and explore to grow skills.'), 60000);
  }`,
  'Fix6: Progressive tutorial hints'
);

// ─── Fix 7: Death sequence extended freeze before eulogy ───
safeReplace(
  `  setTimeout(() => {
    state._deathTimeDilation = 1;
    state._deathPullback = null;
    _deathSequenceActive = false;
    c.dead = false;
    // Soul departure flash — bridges 3D→2D transition
    const df = document.createElement('div');
    df.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;opacity:1;transition:opacity 0.5s ease;pointer-events:none;';
    document.body.appendChild(df);
    requestAnimationFrame(() => { df.style.opacity = '0'; setTimeout(() => df.remove(), 600); });
    exitGunnerMode(true);
    showEulogy(c.deathStats, cause);
  }, 3000);`,
  `  // Phase 1: 3 second slow-mo pullback (existing)
  setTimeout(() => {
    // Phase 2: 1.5s full freeze — camera holds on wreckage
    state._deathTimeDilation = 0;
    setTimeout(() => {
      state._deathTimeDilation = 1;
      state._deathPullback = null;
      _deathSequenceActive = false;
      c.dead = false;
      // Soul departure flash — bridges 3D→2D transition
      const df = document.createElement('div');
      df.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;opacity:1;transition:opacity 0.5s ease;pointer-events:none;';
      document.body.appendChild(df);
      requestAnimationFrame(() => { df.style.opacity = '0'; setTimeout(() => df.remove(), 600); });
      exitGunnerMode(true);
      showEulogy(c.deathStats, cause);
    }, 1500);
  }, 3000);`,
  'Fix7: Death freeze-frame before eulogy'
);

// ─── Fix 8: Spawn 1 past-life ghost NPC in space ───
safeReplace(
  `function spawnSystemNPCs() {
  // Clear existing
  state.npcShips.forEach(n => { scene.remove(n.group); disposeObject(n.group); });
  state.npcShips = [];
  // Spawn only 2-3 NPCs to prevent crashes (1 friendly, 1-2 hostile)
  spawnNPCShip('patrol');
  spawnNPCShip('pirate');
  if (Math.random() > 0.5) spawnNPCShip('raider');
}`,
  `function spawnSystemNPCs() {
  // Clear existing
  state.npcShips.forEach(n => { scene.remove(n.group); disposeObject(n.group); });
  state.npcShips = [];
  // Spawn only 2-3 NPCs to prevent crashes (1 friendly, 1-2 hostile)
  spawnNPCShip('patrol');
  spawnNPCShip('pirate');
  if (Math.random() > 0.5) spawnNPCShip('raider');
  // Past life ghost NPC — haunt the player with their former selves
  if (state.pastLives.length > 0 && Math.random() > 0.4) {
    const ghost = state.pastLives[Math.floor(Math.random() * state.pastLives.length)];
    spawnNPCShip('patrol'); // friendly ghost
    const lastNpc = state.npcShips[state.npcShips.length - 1];
    if (lastNpc) {
      lastNpc.name = ghost.name;
      lastNpc.isGhost = true;
      lastNpc.friendly = true;
      // Ghost tint — ethereal blue-white
      lastNpc.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0x6688ff);
          child.material.emissiveIntensity = 0.6;
          child.material.transparent = true;
          child.material.opacity = 0.7;
        }
      });
      addComms('Soul Echo', 'A familiar presence... ' + ghost.name + ' (' + ghost.occupation + ') drifts nearby.');
    }
  }
}`,
  'Fix8: Past life ghost NPC spawns'
);

// ─── Fix 9: Genome bars show gameplay multiplier ───
safeReplace(
  `    skills.innerHTML = aptitudes.map(a => {
      const val = g[a.gene];
      const pct = (val / 255 * 100).toFixed(0);
      return \`<div class="stat-row" style="font-size:0.78rem;">
        \${a.name} <div class="stat-bar"><div class="stat-fill" style="width:\${pct}%;background:var(--blue)"></div></div>
        <span style="min-width:30px;text-align:right;color:var(--muted);font-size:0.7rem">\${pct}%</span>
      </div>\`;
    }).join('');`,
  `    skills.innerHTML = aptitudes.map(a => {
      const val = g[a.gene];
      const pct = (val / 255 * 100).toFixed(0);
      const mult = (0.5 + val / 255).toFixed(2);
      return \`<div class="stat-row" style="font-size:0.78rem;">
        \${a.name} <div class="stat-bar"><div class="stat-fill" style="width:\${pct}%;background:var(--blue)"></div></div>
        <span style="min-width:55px;text-align:right;color:var(--muted);font-size:0.7rem">\${pct}% <span style="color:\${val >= 180 ? 'var(--success)' : val >= 100 ? 'var(--blue)' : 'var(--danger)'}">x\${mult}</span></span>
      </div>\`;
    }).join('');`,
  'Fix9: Genome bars show multiplier'
);

// ─── Fix 10: Re-roll button shows FREE for first-lifers ───
safeReplace(
  `    const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
    document.getElementById('reroll-cost').textContent = cost;
  }, t6);`,
  `    const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
    const isFreeReroll = state.player.rebirths === 0 && state.karmaRerollCount === 0;
    document.getElementById('reroll-cost').textContent = isFreeReroll ? 'FREE' : cost;
  }, t6);`,
  'Fix10: Reroll button shows FREE for first-lifers'
);

fs.writeFileSync(file, src, 'utf8');
console.log('\n=== AUDIT 25 RESULT: ' + applied + ' applied, ' + failed + ' failed ===');
// Brace balance check
const open = (src.match(/\{/g) || []).length;
const close = (src.match(/\}/g) || []).length;
console.log('Braces: { ' + open + ' } ' + close + ' delta=' + (open - close));
