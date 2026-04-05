#!/usr/bin/env node
/**
 * fix_karma_polish.cjs — Audit 10: Death→Rebirth Polish
 * 10 fixes for the Karma Wheel and death-rebirth flow
 * Design doc: "The Karma Wheel UI needs to be the most polished, most dramatic,
 *              most dopamine-engineered screen in the entire game."
 */
const fs = require('fs');
const FILE = require('path').join(__dirname, 'public', 'index.html');

let src = fs.readFileSync(FILE, 'utf8');
const isCRLF = src.includes('\r\n');
const cr = s => isCRLF ? s.replace(/(?<!\r)\n/g, '\r\n') : s;
let changes = 0, errors = 0;

function countChar(s, ch) { let n = 0; for (const c of s) if (c === ch) n++; return n; }
const bracesBefore = countChar(src, '{') - countChar(src, '}');
const parensBefore = countChar(src, '(') - countChar(src, ')');
const bracketsBefore = countChar(src, '[') - countChar(src, ']');

function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!src.includes(old)) {
    console.error('❌ NOT FOUND:', label);
    errors++;
    return false;
  }
  const count = src.split(old).length - 1;
  if (count > 1) {
    console.error('❌ AMBIGUOUS (' + count + ' matches):', label);
    errors++;
    return false;
  }
  src = src.replace(old, nw);
  changes++;
  console.log('✅', label);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// FIX 1: CSS — Rarity-scaled screen shake variants
// Epic shakes longer, Legendary shakes harder + longer
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '.karma-shake{animation:karmaScreenShake 0.4s ease-out;}',
  '.karma-shake{animation:karmaScreenShake 0.4s ease-out;}\n' +
  '.karma-shake-epic{animation:karmaScreenShake 0.6s ease-out;}\n' +
  '@keyframes karmaShakeLegendary{0%,100%{transform:translate(0,0);}10%{transform:translate(-8px,4px);}20%{transform:translate(6px,-6px);}30%{transform:translate(-5px,8px);}40%{transform:translate(8px,-3px);}50%{transform:translate(-6px,-5px);}60%{transform:translate(5px,6px);}70%{transform:translate(-8px,3px);}80%{transform:translate(6px,-8px);}90%{transform:translate(-3px,6px);}}\n' +
  '.karma-shake-legendary{animation:karmaShakeLegendary 0.8s ease-out;}',
  'CSS: rarity-scaled screen shake (epic + legendary)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 2: SFX — Add 3 new karma sound types for audio variety
// karma_step (soft per-stage), karma_accept (triumphant), karma_common (muted)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "case 'shield_break': { osc.type = 'sawtooth';",
  "case 'karma_step': osc.type='triangle'; osc.frequency.setValueAtTime(330,now); osc.frequency.setValueAtTime(440,now+0.06); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.15); osc.start(now); osc.stop(now+0.15); break;\n" +
  "      case 'karma_accept': { const oa=ctx.createOscillator(); oa.type='sine'; oa.frequency.setValueAtTime(440,now); oa.frequency.setValueAtTime(554,now+0.15); oa.frequency.setValueAtTime(659,now+0.3); oa.frequency.setValueAtTime(880,now+0.5); oa.connect(gain); gain.gain.setValueAtTime(0.14*vol,now); gain.gain.linearRampToValueAtTime(0.08*vol,now+0.4); gain.gain.exponentialRampToValueAtTime(0.001,now+1.0); oa.start(now); oa.stop(now+1.0); osc.disconnect(); return; }\n" +
  "      case 'karma_common': osc.type='triangle'; osc.frequency.setValueAtTime(220,now); osc.frequency.exponentialRampToValueAtTime(165,now+0.2); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.25); osc.start(now); osc.stop(now+0.25); break;\n" +
  "      case 'shield_break': { osc.type = 'sawtooth';",
  'SFX: karma_step + karma_accept + karma_common'
);

// ═══════════════════════════════════════════════════════════════
// FIX 3: Eulogy — Skip button 3s→5s (let grief breathe)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "setTimeout(() => { skipBtn.style.opacity = '1'; }, 3000);",
  "setTimeout(() => { skipBtn.style.opacity = '1'; }, 5000);",
  'Eulogy: skip button delay 3s→5s'
);

// ═══════════════════════════════════════════════════════════════
// FIX 4: Eulogy — Auto-advance 6s→9s
// Transition text fades in at 5s+2s=7s, was being cut off at 6s
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '// Auto-advance to Karma Wheel after 6 seconds\n  setTimeout(advanceToKarma, 6000);',
  '// Auto-advance to Karma Wheel after 9 seconds — let all animations finish\n  setTimeout(advanceToKarma, 9000);',
  'Eulogy: auto-advance 6s→9s (text was cut off)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 5: Eulogy — Past-life continuity reference
// Display "Life #N ends" for subsequent deaths
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "document.getElementById('eulogy-epitaph').textContent = EPITAPHS[Math.floor(Math.random() * EPITAPHS.length)];",
  "document.getElementById('eulogy-epitaph').textContent = EPITAPHS[Math.floor(Math.random() * EPITAPHS.length)];\n" +
  "  \n" +
  "  // Past-life continuity \u2014 display life number on subsequent deaths\n" +
  "  const lifeNum = (state.player.rebirths || 0) + 1;\n" +
  "  if (lifeNum > 1) {\n" +
  "    const transEl = document.querySelector('.eulogy-transition');\n" +
  "    if (transEl) transEl.textContent = 'Life #' + lifeNum + ' ends \u2014 But in Old Eden, death is a door...';\n" +
  "  }",
  'Eulogy: past-life reference (Life #N)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 6: Karma generator — Wealth weighted by rarity
// Legendary gets 2500-5000, Common gets 300-700
// ═══════════════════════════════════════════════════════════════
safeReplace(
  'const wealthRoll = 300 + Math.floor(Math.random() * 4700);',
  'const wealthBase = {legendary:2500,epic:1500,rare:800,uncommon:400,common:300};\n' +
  '  const wealthRange = {legendary:2500,epic:2000,rare:1500,uncommon:800,common:400};\n' +
  '  const wealthRoll = (wealthBase[rarity]||300) + Math.floor(Math.random() * (wealthRange[rarity]||400));',
  'Karma: wealth correlated with rarity'
);

// ═══════════════════════════════════════════════════════════════
// FIX 7: presentKarmaCard — Full replacement
// Changes: rarity-scaled timing, particle contrast, aura sizing,
//          screen shake per rarity, distinct SFX per stage,
//          no double-beep for common/uncommon
// ═══════════════════════════════════════════════════════════════
const pcStartMarker = cr('function presentKarmaCard(roll) {');
const pcEndMarker = cr('// ================================================================\n//  DEATH TICKER');
const pcStart = src.indexOf(pcStartMarker);
const pcEnd = src.indexOf(pcEndMarker, pcStart);

if (pcStart === -1) { console.error('❌ NOT FOUND: presentKarmaCard function start'); errors++; }
else if (pcEnd === -1) { console.error('❌ NOT FOUND: DEATH TICKER marker after presentKarmaCard'); errors++; }
else {
  // New presentKarmaCard with all improvements
  // Uses string concatenation instead of template literals to avoid ${}
  // escaping issues in this .cjs file's template literal wrapper
  const newPC = cr(
'function presentKarmaCard(roll) {\n' +
'  const card = document.getElementById(\'karma-card\');\n' +
'  const nameEl = document.getElementById(\'karma-name\');\n' +
'  const titleEl = document.getElementById(\'karma-title\');\n' +
'  const rarityEl = document.getElementById(\'karma-rarity\');\n' +
'  const genesEl = document.getElementById(\'karma-genes\');\n' +
'  const wealthEl = document.getElementById(\'karma-wealth\');\n' +
'  const factionEl = document.getElementById(\'karma-faction\');\n' +
'  const backstoryEl = document.getElementById(\'karma-backstory\');\n' +
'  const actionsEl = document.getElementById(\'karma-actions\');\n' +
'  const aura = document.getElementById(\'karma-aura\');\n' +
'  \n' +
'  // Reset card state\n' +
'  card.className = \'karma-card\';\n' +
'  actionsEl.classList.remove(\'visible\');\n' +
'  nameEl.textContent = \'???\';\n' +
'  nameEl.className = \'karma-npc-name\';\n' +
'  titleEl.textContent = \'???\';\n' +
'  rarityEl.textContent = \'\';\n' +
'  genesEl.innerHTML = \'\';\n' +
'  wealthEl.innerHTML = \'Wealth: <span class="kw-val">???</span>\';\n' +
'  factionEl.textContent = \'\';\n' +
'  backstoryEl.textContent = \'\';\n' +
'  \n' +
'  // Timing scales by rarity \u2014 legendary gets dramatic pauses, common is brisk\n' +
'  const rd = {common:0.6,uncommon:0.7,rare:0.85,epic:1.0,legendary:1.3}[roll.rarity] || 1.0;\n' +
'  const t1 = Math.round(600*rd), t2 = Math.round(1200*rd), t3 = Math.round(1800*rd);\n' +
'  const t4 = Math.round(2400*rd), t5 = Math.round(3200*rd), t6 = Math.round(3800*rd);\n' +
'  \n' +
'  // Particle burst \u2014 dramatic contrast between rarities\n' +
'  const particleCount = {legendary:80,epic:60,rare:45,uncommon:20,common:10}[roll.rarity] || 10;\n' +
'  const particleEl = document.getElementById(\'karma-particles\');\n' +
'  particleEl.innerHTML = \'\';\n' +
'  for (let i = 0; i < particleCount; i++) {\n' +
'    const p = document.createElement(\'div\');\n' +
'    p.className = \'karma-spin-particle\';\n' +
'    p.style.left = \'50%\';\n' +
'    p.style.top = \'50%\';\n' +
'    p.style.background = roll.rarityColor;\n' +
'    const angle = (i / particleCount) * Math.PI * 2;\n' +
'    const dist = 150 + Math.random() * 300;\n' +
'    p.style.setProperty(\'--dx\', Math.cos(angle) * dist + \'px\');\n' +
'    p.style.setProperty(\'--dy\', Math.sin(angle) * dist + \'px\');\n' +
'    p.style.animationDelay = Math.random() * 0.3 + \'s\';\n' +
'    const pSize = roll.rarity === \'common\' ? (1 + Math.random()*1.5) : (2 + Math.random()*3);\n' +
'    p.style.width = pSize + \'px\';\n' +
'    p.style.height = p.style.width;\n' +
'    particleEl.appendChild(p);\n' +
'  }\n' +
'  \n' +
'  // Rarity aura \u2014 size and blur scale with rarity\n' +
'  const auraColors = {common:\'transparent\',uncommon:\'rgba(34,204,102,0.12)\',rare:\'rgba(68,170,255,0.18)\',epic:\'rgba(168,85,247,0.22)\',legendary:\'rgba(255,215,0,0.25)\'};\n' +
'  aura.style.background = auraColors[roll.rarity] || \'transparent\';\n' +
'  const auraSize = {common:\'0\',uncommon:\'300px\',rare:\'400px\',epic:\'500px\',legendary:\'600px\'}[roll.rarity] || \'400px\';\n' +
'  aura.style.width = auraSize; aura.style.height = auraSize;\n' +
'  aura.style.filter = \'blur(\' + ({common:\'40px\',uncommon:\'60px\',rare:\'80px\',epic:\'100px\',legendary:\'120px\'}[roll.rarity] || \'80px\') + \')\';\n' +
'  \n' +
'  // Screen shake scales by rarity \u2014 legendary rumbles harder\n' +
'  const karmaScreen = document.getElementById(\'screen-karma\');\n' +
'  if (roll.rarity === \'legendary\') {\n' +
'    karmaScreen.classList.add(\'karma-shake-legendary\');\n' +
'    setTimeout(() => karmaScreen.classList.remove(\'karma-shake-legendary\'), 900);\n' +
'  } else if (roll.rarity === \'epic\') {\n' +
'    karmaScreen.classList.add(\'karma-shake-epic\');\n' +
'    setTimeout(() => karmaScreen.classList.remove(\'karma-shake-epic\'), 700);\n' +
'  } else if (roll.rarity === \'rare\') {\n' +
'    karmaScreen.classList.add(\'karma-shake\');\n' +
'    setTimeout(() => karmaScreen.classList.remove(\'karma-shake\'), 500);\n' +
'  }\n' +
'  \n' +
'  // Rarity reveal SFX \u2014 no t=0 for common/uncommon (prevents double-beep)\n' +
'  if (roll.rarity === \'legendary\') AudioSFX.play(\'karma_legendary\');\n' +
'  else if (roll.rarity === \'epic\' || roll.rarity === \'rare\') AudioSFX.play(\'karma_rare\');\n' +
'  \n' +
'  // \u2500\u2500 Staged reveal with distinct SFX per stage \u2500\u2500\n' +
'  setTimeout(() => {\n' +
'    // Step 1: Name + title + rarity badge\n' +
'    nameEl.textContent = roll.name;\n' +
'    titleEl.textContent = roll.title;\n' +
'    rarityEl.textContent = roll.rarity.toUpperCase();\n' +
'    rarityEl.style.background = roll.rarityColor + \'22\';\n' +
'    rarityEl.style.color = roll.rarityColor;\n' +
'    rarityEl.style.border = \'1px solid \' + roll.rarityColor;\n' +
'    if ([\'epic\',\'legendary\'].includes(roll.rarity)) nameEl.classList.add(\'shimmer\');\n' +
'    AudioSFX.play(\'karma_step\');\n' +
'  }, t1);\n' +
'  \n' +
'  setTimeout(() => {\n' +
'    // Step 2: Genome bars + pixel art\n' +
'    const geneNames = [\'CMB\',\'PLT\',\'ENG\',\'TRD\',\'SCI\'];\n' +
'    const geneColors = [\'#ff4444\',\'#44aaff\',\'#22cc66\',\'#ffd700\',\'#a855f7\'];\n' +
'    genesEl.innerHTML = geneNames.map((n, i) => {\n' +
'      return \'<div style="text-align:center;font-size:0.6rem;color:var(--muted);">\' + n +\n' +
'        \'<div class="karma-gene-bar"><div class="karma-gene-fill" id="kg-\' + i + \'" style="width:0%;background:\' + geneColors[i] + \'"></div></div></div>\';\n' +
'    }).join(\'\');\n' +
'    requestAnimationFrame(() => {\n' +
'      geneNames.forEach((_, i) => {\n' +
'        const bar = document.getElementById(\'kg-\' + i);\n' +
'        if (bar) bar.style.width = (roll.genome[32 + i] / 255 * 100) + \'%\';\n' +
'      });\n' +
'    });\n' +
'    drawGenome(new Uint8Array(roll.genome), document.getElementById(\'karma-genome-canvas\'), 96);\n' +
'    AudioSFX.play(\'karma_reveal\');\n' +
'  }, t2);\n' +
'  \n' +
'  setTimeout(() => {\n' +
'    // Step 3: Faction\n' +
'    factionEl.innerHTML = \'Faction: <span style="color:\' + roll.factionColor + \'">\' + roll.factionName + \'</span>\';\n' +
'    AudioSFX.play(\'karma_step\');\n' +
'  }, t3);\n' +
'  \n' +
'  setTimeout(() => {\n' +
'    // Step 4: Wealth \u2014 counting animation for drama\n' +
'    const wealthTarget = roll.wealth;\n' +
'    const wealthTier = wealthTarget >= 3000 ? \'rich\' : wealthTarget >= 1000 ? \'comfortable\' : wealthTarget >= 300 ? \'modest\' : \'destitute\';\n' +
'    const wealthColor = wealthTarget >= 3000 ? \'#ffd700\' : wealthTarget >= 1000 ? \'#22cc66\' : wealthTarget >= 300 ? \'#aaa\' : \'#ff4444\';\n' +
'    let wealthCurrent = 0;\n' +
'    const wealthDuration = 800;\n' +
'    const wealthStart = performance.now();\n' +
'    function animateWealth() {\n' +
'      const elapsed = performance.now() - wealthStart;\n' +
'      const progress = Math.min(1, elapsed / wealthDuration);\n' +
'      const eased = 1 - Math.pow(1 - progress, 3);\n' +
'      wealthCurrent = Math.floor(wealthTarget * eased);\n' +
'      wealthEl.innerHTML = \'Wealth: <span class="kw-val" style="color:\' + wealthColor + \'">\' + wealthCurrent.toLocaleString() + \' EC</span> <span style="font-size:0.7rem;color:var(--muted)">(\' + (progress >= 1 ? wealthTier : \'...\') + \')</span>\';\n' +
'      if (progress < 1) requestAnimationFrame(animateWealth);\n' +
'    }\n' +
'    animateWealth();\n' +
'    AudioSFX.play(\'karma_reveal\');\n' +
'  }, t4);\n' +
'  \n' +
'  setTimeout(() => {\n' +
'    // Step 5: Card reveal + backstory + aura glow\n' +
'    card.classList.add(\'revealed\', \'rarity-\' + roll.rarity);\n' +
'    backstoryEl.textContent = roll.backstory;\n' +
'    aura.classList.add(\'active\');\n' +
'  }, t5);\n' +
'  \n' +
'  setTimeout(() => {\n' +
'    // Step 6: Show action buttons\n' +
'    actionsEl.classList.add(\'visible\');\n' +
'    const cost = KARMA_REROLL_COSTS[Math.min(state.karmaRerollCount, KARMA_REROLL_COSTS.length - 1)];\n' +
'    document.getElementById(\'reroll-cost\').textContent = cost;\n' +
'  }, t6);\n' +
'}\n' +
'\n'
  );

  src = src.substring(0, pcStart) + newPC + src.substring(pcEnd);
  changes++;
  console.log('✅ presentKarmaCard: full rarity-scaled replacement (timing/particles/aura/shake/sfx)');
}

// ═══════════════════════════════════════════════════════════════
// FIX 8: Death flash — white flash on soul departure (3D→2D bridge)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '    exitGunnerMode(true);\n    showEulogy(c.deathStats, cause);',
  '    // Soul departure flash \u2014 bridges 3D\u21922D transition\n' +
  '    const df = document.createElement(\'div\');\n' +
  '    df.style.cssText = \'position:fixed;inset:0;background:#fff;z-index:9999;opacity:1;transition:opacity 0.5s ease;pointer-events:none;\';\n' +
  '    document.body.appendChild(df);\n' +
  '    requestAnimationFrame(() => { df.style.opacity = \'0\'; setTimeout(() => df.remove(), 600); });\n' +
  '    exitGunnerMode(true);\n    showEulogy(c.deathStats, cause);',
  'Death: soul departure white flash'
);

// ═══════════════════════════════════════════════════════════════
// FIX 9: Accept karma — rebirth transition (white flash → text → bridge)
// The most important moment: "you are reborn" should NOT feel like a menu click
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "  AudioSFX.play('karma_reveal');\n  checkAndClaimMilestones();\n  saveGame();\n  state.karmaRoll = null;\n  updateRebirthScreen();\n  showScreen('bridge');",
  "  AudioSFX.play('karma_accept');\n" +
  "  checkAndClaimMilestones();\n" +
  "  saveGame();\n" +
  "  state.karmaRoll = null;\n" +
  "  updateRebirthScreen();\n" +
  "  // Rebirth transition \u2014 \"A new soul awakens\"\n" +
  "  const rb = document.createElement('div');\n" +
  "  rb.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;display:flex;align-items:center;justify-content:center;pointer-events:none;transition:background 0.8s ease 0.3s;';\n" +
  "  rb.innerHTML = '<span style=\"color:#1a0a2e;font-size:1.3rem;letter-spacing:0.3em;font-weight:200;opacity:0;transition:opacity 0.5s ease 0.2s;\">A new soul awakens...</span>';\n" +
  "  document.body.appendChild(rb);\n" +
  "  requestAnimationFrame(() => {\n" +
  "    rb.style.background = '#1a0a2e';\n" +
  "    rb.querySelector('span').style.opacity = '1';\n" +
  "  });\n" +
  "  setTimeout(() => {\n" +
  "    rb.style.opacity = '0';\n" +
  "    rb.style.transition = 'opacity 0.5s ease';\n" +
  "    setTimeout(() => { rb.remove(); showScreen('bridge'); }, 600);\n" +
  "  }, 2000);",
  'Accept karma: rebirth transition with white flash + text'
);

// ═══════════════════════════════════════════════════════════════
// FIX 10: Re-roll — Escalating spinner duration (more SM = more anticipation)
// 1st re-roll: 2.3s, 2nd: 2.6s, 3rd: 2.9s, ..., capped at 3.5s
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "  AudioSFX.play('karma_spin');\n" +
  "  setTimeout(() => {\n" +
  "    spinner.classList.add('hidden');\n" +
  "    subtitle.textContent = 'Your new fate awaits.';\n" +
  "    presentKarmaCard(roll);\n" +
  "  }, 1200);",
  "  AudioSFX.play('karma_spin');\n" +
  "  const rerollDur = 2000 + Math.min(state.karmaRerollCount * 300, 1500);\n" +
  "  setTimeout(() => {\n" +
  "    spinner.classList.add('hidden');\n" +
  "    subtitle.textContent = 'Your new fate awaits.';\n" +
  "    presentKarmaCard(roll);\n" +
  "  }, rerollDur);",
  'Reroll: escalating spinner duration'
);

// ═══════════════════════════════════════════════════════════════
// Balance check
// ═══════════════════════════════════════════════════════════════
const bracesAfter = countChar(src, '{') - countChar(src, '}');
const parensAfter = countChar(src, '(') - countChar(src, ')');
const bracketsAfter = countChar(src, '[') - countChar(src, ']');

const dB = bracesAfter - bracesBefore;
const dP = parensAfter - parensBefore;
const dK = bracketsAfter - bracketsBefore;

console.log('\n═══ Summary ═══');
console.log(`Changes: ${changes}, Errors: ${errors}`);
console.log(`Balance delta — B:${dB} P:${dP} K:${dK}`);

if (errors > 0) {
  console.error('\n❌ ABORTING — ' + errors + ' errors. File NOT written.');
  process.exit(1);
}

if (dB !== 0 || dP !== 0 || dK !== 0) {
  console.error('\n⚠ WARNING: Balance drift detected! Proceeding with caution.');
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n✅ File written: ' + FILE);
console.log('Lines: ' + src.split(isCRLF ? '\r\n' : '\n').length);
