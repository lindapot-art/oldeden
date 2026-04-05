#!/usr/bin/env node
/**
 * Audit 38 — Design-driven polish: Karma Wheel, combat feel, first experience
 * Fixes the core player experience per design doc priorities.
 */

const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
function cr(s) { return s.replace(/\n/g, '\r\n'); }

function safeReplace(file, oldStr, newStr, label) {
  const abs = path.resolve(__dirname, file);
  let content = fs.readFileSync(abs, 'utf-8');
  const old = cr(oldStr);
  const idx = content.indexOf(old);
  if (idx === -1) {
    console.error(`  \u2718 [${label}] old string not found in ${file}`);
    fail++;
    return;
  }
  const secondIdx = content.indexOf(old, idx + 1);
  if (secondIdx !== -1) {
    console.error(`  \u2718 [${label}] multiple matches in ${file}`);
    fail++;
    return;
  }
  content = content.slice(0, idx) + cr(newStr) + content.slice(idx + old.length);
  fs.writeFileSync(abs, content, 'utf-8');
  console.log(`  \u2714 [${label}] OK`);
  ok++;
}

// =======================================================================
//  F1 — KARMA WHEEL: Reorder staged reveal so card appears FIRST,
//       then name, genome bars, faction, wealth animate WHILE VISIBLE
// =======================================================================
// The old order: t1=name, t2=genome, t3=faction, t4=wealth, t5=card.revealed, t6=actions
// The new order: t1=card.revealed, t2=name, t3=genome, t4=faction, t5=wealth, t6=actions
// This ensures all the dramatic animations play WHILE the card is visible.
safeReplace(
  'public/index.html',
  `  // \u2500\u2500 Staged reveal with distinct SFX per stage \u2500\u2500
  _karmaTimeouts.push(setTimeout(() => {
    // Step 1: Name + title + rarity badge
    nameEl.textContent = roll.name;
    titleEl.textContent = roll.title;
    rarityEl.textContent = roll.rarity.toUpperCase();
    rarityEl.style.background = roll.rarityColor + '22';
    rarityEl.style.color = roll.rarityColor;
    rarityEl.style.border = '1px solid ' + roll.rarityColor;
    if (['epic','legendary'].includes(roll.rarity)) nameEl.classList.add('shimmer');
    AudioSFX.play('karma_step');
  }, t1));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 2: Genome bars + pixel art
    const geneNames = ['CMB','PLT','ENG','TRD','SCI'];
    const geneColors = ['#ff4444','#44aaff','#22cc66','#ffd700','#a855f7'];
    genesEl.innerHTML = geneNames.map((n, i) => {
      return '<div style="text-align:center;font-size:0.6rem;color:var(--muted);">' + n +
        '<div class="karma-gene-bar"><div class="karma-gene-fill" id="kg-' + i + '" style="width:0%;background:' + geneColors[i] + '"></div></div></div>';
    }).join('');
    requestAnimationFrame(() => {
      geneNames.forEach((_, i) => {
        const bar = document.getElementById('kg-' + i);
        if (bar) bar.style.width = (roll.genome[32 + i] / 255 * 100) + '%';
      });
    });
    drawGenome(new Uint8Array(roll.genome), document.getElementById('karma-genome-canvas'), 96);
    AudioSFX.play('karma_reveal');
  }, t2));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 3: Faction
    factionEl.innerHTML = 'Faction: <span style="color:' + roll.factionColor + '">' + roll.factionName + '</span>';
    AudioSFX.play('karma_step');
  }, t3));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 4: Wealth \u2014 counting animation for drama
    const wealthTarget = roll.wealth;
    const wealthTier = wealthTarget >= 3000 ? 'rich' : wealthTarget >= 1000 ? 'comfortable' : wealthTarget >= 300 ? 'modest' : 'destitute';
    const wealthColor = wealthTarget >= 3000 ? '#ffd700' : wealthTarget >= 1000 ? '#22cc66' : wealthTarget >= 300 ? '#aaa' : '#ff4444';
    let wealthCurrent = 0;
    const wealthDuration = 800;
    const wealthStart = performance.now();
    function animateWealth() {
      const elapsed = performance.now() - wealthStart;
      const progress = Math.min(1, elapsed / wealthDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      wealthCurrent = Math.floor(wealthTarget * eased);
      wealthEl.innerHTML = 'Wealth: <span class="kw-val" style="color:' + wealthColor + '">' + wealthCurrent.toLocaleString() + ' EC</span> <span style="font-size:0.7rem;color:var(--muted)">(' + (progress >= 1 ? wealthTier : '...') + ')</span>';
      if (progress < 1) requestAnimationFrame(animateWealth);
    }
    animateWealth();
    AudioSFX.play('karma_reveal');
  }, t4));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 5: Card reveal + backstory + aura glow
    card.classList.add('revealed', 'rarity-' + roll.rarity);
    backstoryEl.textContent = roll.backstory;
    aura.classList.add('active');
  }, t5));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 6: Show action buttons
    actionsEl.classList.add('visible');
    const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
    const isFreeReroll = state.player.rebirths === 0 && state.karmaRerollCount === 0;
    document.getElementById('reroll-cost').textContent = isFreeReroll ? 'FREE' : cost;
  }, t6));`,
  `  // \u2500\u2500 Staged reveal: card appears FIRST, then stats animate while visible \u2500\u2500
  _karmaTimeouts.push(setTimeout(() => {
    // Step 1: Card reveal + backstory + aura glow (CARD VISIBLE FIRST)
    card.classList.add('revealed', 'rarity-' + roll.rarity);
    backstoryEl.textContent = roll.backstory;
    aura.classList.add('active');
    AudioSFX.play('karma_common');
  }, t1));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 2: Name + title + rarity badge (now visible to player)
    nameEl.textContent = roll.name;
    titleEl.textContent = roll.title;
    rarityEl.textContent = roll.rarity.toUpperCase();
    rarityEl.style.background = roll.rarityColor + '22';
    rarityEl.style.color = roll.rarityColor;
    rarityEl.style.border = '1px solid ' + roll.rarityColor;
    if (['epic','legendary'].includes(roll.rarity)) nameEl.classList.add('shimmer');
    AudioSFX.play('karma_step');
  }, t2));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 3: Genome bars + pixel art (animate while card is visible)
    const geneNames = ['CMB','PLT','ENG','TRD','SCI'];
    const geneColors = ['#ff4444','#44aaff','#22cc66','#ffd700','#a855f7'];
    genesEl.innerHTML = geneNames.map((n, i) => {
      return '<div style="text-align:center;font-size:0.6rem;color:var(--muted);">' + n +
        '<div class="karma-gene-bar"><div class="karma-gene-fill" id="kg-' + i + '" style="width:0%;background:' + geneColors[i] + '"></div></div></div>';
    }).join('');
    requestAnimationFrame(() => {
      geneNames.forEach((_, i) => {
        const bar = document.getElementById('kg-' + i);
        if (bar) bar.style.width = (roll.genome[32 + i] / 255 * 100) + '%';
      });
    });
    drawGenome(new Uint8Array(roll.genome), document.getElementById('karma-genome-canvas'), 96);
    AudioSFX.play('karma_reveal');
  }, t3));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 4: Faction (visible reveal)
    factionEl.innerHTML = 'Faction: <span style="color:' + roll.factionColor + '">' + roll.factionName + '</span>';
    AudioSFX.play('karma_step');
  }, t4));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 5: Wealth \u2014 counting animation (LAST stat for maximum drama)
    const wealthTarget = roll.wealth;
    const wealthTier = wealthTarget >= 3000 ? 'rich' : wealthTarget >= 1000 ? 'comfortable' : wealthTarget >= 300 ? 'modest' : 'destitute';
    const wealthColor = wealthTarget >= 3000 ? '#ffd700' : wealthTarget >= 1000 ? '#22cc66' : wealthTarget >= 300 ? '#aaa' : '#ff4444';
    let wealthCurrent = 0;
    const wealthDuration = 800;
    const wealthStart = performance.now();
    function animateWealth() {
      const elapsed = performance.now() - wealthStart;
      const progress = Math.min(1, elapsed / wealthDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      wealthCurrent = Math.floor(wealthTarget * eased);
      wealthEl.innerHTML = 'Wealth: <span class="kw-val" style="color:' + wealthColor + '">' + wealthCurrent.toLocaleString() + ' EC</span> <span style="font-size:0.7rem;color:var(--muted)">(' + (progress >= 1 ? wealthTier : '...') + ')</span>';
      if (progress < 1) requestAnimationFrame(animateWealth);
    }
    animateWealth();
    AudioSFX.play('karma_reveal');
  }, t5));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 6: Show action buttons
    actionsEl.classList.add('visible');
    const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];
    const isFreeReroll = state.player.rebirths === 0 && state.karmaRerollCount === 0;
    document.getElementById('reroll-cost').textContent = isFreeReroll ? 'FREE' : cost;
  }, t6));`,
  'F1-karma-reveal-reorder'
);

// =======================================================================
//  F2 — AUTO-AGGRO: Reduce from 60s to 15s on first life
// =======================================================================
safeReplace(
  'public/index.html',
  `      // On first life, auto-aggro after 60s to push players into the combat loop
      const autoAggro = isFirstLife && state.gameTime > 60000;`,
  `      // On first life, auto-aggro after 15s to push players into combat quickly
      const autoAggro = isFirstLife && state.gameTime > 15000;`,
  'F2-auto-aggro-faster'
);

// =======================================================================
//  F3 — DAMAGE VIGNETTE: Start subtle vignette at 60% hull, escalate
// =======================================================================
safeReplace(
  'public/index.html',
  `  // Damage flash
  if (c.damageFlash > 0) {
    const isHullDmg = state.ship.shield <= 0;
    const flashAlpha = isHullDmg ? (c.damageFlash / 200) * 0.4 : (c.damageFlash / 200) * 0.3;
    hudCtx.globalAlpha = flashAlpha;
    hudCtx.fillStyle = isHullDmg ? '#ff2200' : '#ff0000';
    hudCtx.fillRect(0, 0, W, H);
    if (isHullDmg) {
      if (!c._dmgVigGrad || c._dmgVigW !== W || c._dmgVigH !== H) {
        c._dmgVigGrad = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.2, cx, cy, Math.max(W,H)*0.55);
        c._dmgVigGrad.addColorStop(0, 'rgba(255,0,0,0)');
        c._dmgVigGrad.addColorStop(1, 'rgba(255,0,0,0.24)');
        c._dmgVigW = W; c._dmgVigH = H;
      }
      hudCtx.fillStyle = c._dmgVigGrad;
      hudCtx.fillRect(0, 0, W, H);
    }
    hudCtx.globalAlpha = 1;
  }`,
  `  // Damage flash (on hit)
  if (c.damageFlash > 0) {
    const isHullDmg = state.ship.shield <= 0;
    const flashAlpha = isHullDmg ? (c.damageFlash / 200) * 0.4 : (c.damageFlash / 200) * 0.3;
    hudCtx.globalAlpha = flashAlpha;
    hudCtx.fillStyle = isHullDmg ? '#ff2200' : '#ff0000';
    hudCtx.fillRect(0, 0, W, H);
    hudCtx.globalAlpha = 1;
  }
  // Persistent hull damage vignette \u2014 starts subtle at 60%, escalates to red at <15%
  const hullPct = state.ship.hull / state.ship.maxHull;
  if (hullPct < 0.6) {
    const vigIntensity = 1 - (hullPct / 0.6); // 0 at 60%, 1 at 0%
    const vigR = hullPct < 0.3 ? 255 : 255;
    const vigG = hullPct < 0.3 ? 0 : Math.round(140 * (1 - vigIntensity));
    const vigAlpha = 0.06 + vigIntensity * 0.22;
    // Pulse effect below 15% hull \u2014 breathing danger
    const pulse = hullPct < 0.15 ? (0.85 + 0.15 * Math.sin(state.gameTime * 0.006)) : 1;
    if (!c._dmgVigGrad || c._dmgVigW !== W || c._dmgVigH !== H || c._dmgVigAlpha !== vigAlpha) {
      c._dmgVigGrad = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.25, cx, cy, Math.max(W,H)*0.55);
      c._dmgVigGrad.addColorStop(0, 'rgba(' + vigR + ',' + vigG + ',0,0)');
      c._dmgVigGrad.addColorStop(1, 'rgba(' + vigR + ',' + vigG + ',0,' + vigAlpha + ')');
      c._dmgVigW = W; c._dmgVigH = H; c._dmgVigAlpha = vigAlpha;
    }
    hudCtx.globalAlpha = pulse;
    hudCtx.fillStyle = c._dmgVigGrad;
    hudCtx.fillRect(0, 0, W, H);
    hudCtx.globalAlpha = 1;
  }`,
  'F3-persistent-damage-vignette'
);

// =======================================================================
//  F4 — EULOGY TIMING: Faster skip on subsequent deaths (2s/5s instead of 5s/9s)
// =======================================================================
safeReplace(
  'public/index.html',
  `  // First death: faster pacing to maintain momentum through first death\u2192rebirth
  const _firstDeath = (state.player.rebirths || 0) === 0;
  setTimeout(() => { skipBtn.style.opacity = '1'; }, _firstDeath ? 800 : 5000);
  skipBtn.onclick = advanceToKarma;
  setTimeout(advanceToKarma, _firstDeath ? 4500 : 9000);`,
  `  // First death: fastest pacing. Subsequent: quick skip \u2014 the hook is the Karma Wheel, not the eulogy
  const _firstDeath = (state.player.rebirths || 0) === 0;
  setTimeout(() => { skipBtn.style.opacity = '1'; }, _firstDeath ? 800 : 2000);
  skipBtn.onclick = advanceToKarma;
  setTimeout(advanceToKarma, _firstDeath ? 4500 : 5000);`,
  'F4-eulogy-faster-subsequent'
);

// =======================================================================
//  F5 — FIRE SCREEN SHAKE: Add small shake impulse on weapon fire
// =======================================================================
safeReplace(
  'public/index.html',
  `  c.fireRecoilKick = 0.045; // Camera kick on fire`,
  `  c.fireRecoilKick = 0.045; // Camera kick on fire
  // Fire shake impulse \u2014 makes railgun feel impactful
  if (state.settings.screenShake) { c.shakeX += (Math.random() - 0.5) * 0.8; c.shakeY -= 0.4; }`,
  'F5-fire-screen-shake'
);

// =======================================================================
//  F6 — KILL CONFIRM: Replace full-screen white flash with crosshair glow
// =======================================================================
safeReplace(
  'public/index.html',
  `    // Brief white flash on kill
    if (c.killConfirmTimer > 350) {
      hudCtx.globalAlpha = (c.killConfirmTimer - 350) / 200;
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillRect(0, 0, W, H);
    }`,
  `    // Brief white glow around crosshair on kill (not fullscreen)
    if (c.killConfirmTimer > 350) {
      hudCtx.globalAlpha = (c.killConfirmTimer - 350) / 200;
      const glowR = 50 + (1 - c.killConfirmTimer / 400) * 20;
      const glowGrad = hudCtx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glowGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
      glowGrad.addColorStop(0.5, 'rgba(255,204,0,0.3)');
      glowGrad.addColorStop(1, 'rgba(255,204,0,0)');
      hudCtx.fillStyle = glowGrad;
      hudCtx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
    }`,
  'F6-kill-glow-not-flash'
);

// =======================================================================
//  F7 — SCREEN SHAKE: Support fire shake independent of damage flash
// =======================================================================
// Currently: shake only fires when damageFlash > 0. Need to also support
// the fire shake impulse from F5 which sets shakeX/Y directly.
safeReplace(
  'public/index.html',
  `    // Screen shake
    if (state.settings.screenShake && c.damageFlash > 0) {
      const intensity = (c.damageFlash / 200) * 4.0;
      c.shakeX = (Math.random() - 0.5) * intensity;
      c.shakeY = (Math.random() - 0.5) * intensity;
    } else { c.shakeX = 0; c.shakeY = 0; }`,
  `    // Screen shake \u2014 damage-driven + fire impulse (from spawnNail)
    if (state.settings.screenShake && c.damageFlash > 0) {
      const intensity = (c.damageFlash / 200) * 4.0;
      c.shakeX = (Math.random() - 0.5) * intensity;
      c.shakeY = (Math.random() - 0.5) * intensity;
    } else {
      // Decay fire shake impulse smoothly (preserves values set by spawnNail)
      c.shakeX *= 0.85;
      c.shakeY *= 0.85;
      if (Math.abs(c.shakeX) < 0.01) c.shakeX = 0;
      if (Math.abs(c.shakeY) < 0.01) c.shakeY = 0;
    }`,
  'F7-shake-decay-independent'
);

// =======================================================================
//  F8 — KARMA SFX: Add common/uncommon reveal sound
// =======================================================================
// Currently common/uncommon get NO rarity reveal SFX.
// The `karma_common` case exists in AudioSFX but is never called at reveal.
safeReplace(
  'public/index.html',
  `  // Rarity reveal SFX \u2014 no t=0 for common/uncommon (prevents double-beep)
  if (roll.rarity === 'legendary') AudioSFX.play('karma_legendary');
  else if (roll.rarity === 'epic' || roll.rarity === 'rare') AudioSFX.play('karma_rare');`,
  `  // Rarity reveal SFX
  if (roll.rarity === 'legendary') AudioSFX.play('karma_legendary');
  else if (roll.rarity === 'epic' || roll.rarity === 'rare') AudioSFX.play('karma_rare');
  else AudioSFX.play('karma_common');`,
  'F8-karma-common-sfx'
);

// =======================================================================
console.log(`\n  Audit 38 complete: ${ok} OK, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
