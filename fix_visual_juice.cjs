#!/usr/bin/env node
/**
 * Audit 15 — Visual Juice + Sound Design
 * 9 fixes for "holy shit" combat feel
 */
const fs = require('fs');
const FILE = 'public/index.html';

let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;
const cr = s => s.replace(/\n/g, '\r\n');

function countBraces(s) {
  let b = 0, p = 0, k = 0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') k++; else if (ch === ']') k--;
  }
  return { b, p, k };
}
const before = countBraces(src);

let applied = 0, failed = 0;
function safeReplace(old, replacement, label) {
  const o = cr(old);
  const r = cr(replacement);
  const idx = src.indexOf(o);
  if (idx === -1) { console.log(`  SKIP [${label}] — old string not found`); failed++; return; }
  const second = src.indexOf(o, idx + 1);
  if (second !== -1) { console.log(`  SKIP [${label}] — ambiguous (2+ matches)`); failed++; return; }
  src = src.slice(0, idx) + r + src.slice(idx + o.length);
  console.log(`  \u2713 [${label}]`);
  applied++;
}

// ════════════════════════════════════════════════════
//  FIX 1: Kill confirm SFX louder + 2-note ding-dong
// ════════════════════════════════════════════════════
safeReplace(
  `case 'kill_confirm': osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); osc.frequency.setValueAtTime(1100, now+0.05); gain.gain.setValueAtTime(0.08*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.12); osc.start(now); osc.stop(now+0.12); break;`,
  `case 'kill_confirm': { osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); osc.frequency.setValueAtTime(1100, now+0.06); gain.gain.setValueAtTime(0.14*vol, now); gain.gain.exponentialRampToValueAtTime(0.02*vol, now+0.1); gain.gain.exponentialRampToValueAtTime(0.001, now+0.25); osc.start(now); osc.stop(now+0.25); const o2k=ctx.createOscillator(); o2k.type='sine'; o2k.frequency.setValueAtTime(660,now+0.1); const g2k=ctx.createGain(); g2k.connect(ctx.destination); g2k.gain.setValueAtTime(0.001,now); g2k.gain.setValueAtTime(0.10*vol,now+0.1); g2k.gain.exponentialRampToValueAtTime(0.001,now+0.22); o2k.connect(g2k); o2k.start(now+0.1); o2k.stop(now+0.22); break; }`,
  'Fix 1: Kill confirm SFX louder + 2-note'
);

// ════════════════════════════════════════════════════
//  FIX 2: Hit marker SFX louder + bigger X
// ════════════════════════════════════════════════════
safeReplace(
  `case 'hit_marker': osc.type = 'square'; osc.frequency.setValueAtTime(1600, now); gain.gain.setValueAtTime(0.04*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.04); osc.start(now); osc.stop(now+0.04); break;`,
  `case 'hit_marker': osc.type = 'square'; osc.frequency.setValueAtTime(1600, now); gain.gain.setValueAtTime(0.10*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.06); osc.start(now); osc.stop(now+0.06); break;`,
  'Fix 2a: Hit marker SFX louder'
);

safeReplace(
  `const hm = 10;
    hudCtx.beginPath(); hudCtx.moveTo(cx-hm, cy-hm); hudCtx.lineTo(cx-4, cy-4); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx+hm, cy-hm); hudCtx.lineTo(cx+4, cy-4); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx-hm, cy+hm); hudCtx.lineTo(cx-4, cy+4); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx+hm, cy+hm); hudCtx.lineTo(cx+4, cy+4); hudCtx.stroke();`,
  `const hm = 14;
    hudCtx.beginPath(); hudCtx.moveTo(cx-hm, cy-hm); hudCtx.lineTo(cx-5, cy-5); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx+hm, cy-hm); hudCtx.lineTo(cx+5, cy-5); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx-hm, cy+hm); hudCtx.lineTo(cx-5, cy+5); hudCtx.stroke();
    hudCtx.beginPath(); hudCtx.moveTo(cx+hm, cy+hm); hudCtx.lineTo(cx+5, cy+5); hudCtx.stroke();
    // White crosshair flash on hit
    hudCtx.strokeStyle = '#ffffff'; hudCtx.lineWidth = 1.5; hudCtx.globalAlpha *= 0.6;
    hudCtx.beginPath(); hudCtx.arc(cx, cy, crossSize + 4, 0, Math.PI*2); hudCtx.stroke();`,
  'Fix 2b: Bigger hit X + white crosshair flash'
);

// ════════════════════════════════════════════════════
//  FIX 3: Kill confirmation — white screen flash + "KILL" text
// ════════════════════════════════════════════════════
safeReplace(
  `// Kill confirmation ring
  if (killActive) {
    hudCtx.globalAlpha = Math.min(1, c.killConfirmTimer / 200);
    hudCtx.strokeStyle = '#ffcc00'; hudCtx.lineWidth = 3;
    const killRing = 30 + (1 - c.killConfirmTimer / 400) * 15;
    hudCtx.beginPath(); hudCtx.arc(cx, cy, killRing, 0, Math.PI*2); hudCtx.stroke();
  }`,
  `// Kill confirmation ring + flash + text
  if (killActive) {
    const killA = Math.min(1, c.killConfirmTimer / 200);
    hudCtx.globalAlpha = killA;
    hudCtx.strokeStyle = '#ffcc00'; hudCtx.lineWidth = 3;
    const killRing = 30 + (1 - c.killConfirmTimer / 400) * 15;
    hudCtx.beginPath(); hudCtx.arc(cx, cy, killRing, 0, Math.PI*2); hudCtx.stroke();
    // Brief white flash on kill
    if (c.killConfirmTimer > 350) {
      hudCtx.globalAlpha = (c.killConfirmTimer - 350) / 200;
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillRect(0, 0, W, H);
    }
    // "KILL" text below crosshair
    hudCtx.globalAlpha = killA * 0.9;
    hudCtx.font = 'bold 18px "Segoe UI"';
    hudCtx.fillStyle = '#ffcc00';
    hudCtx.textAlign = 'center';
    hudCtx.fillText('KILL', cx, cy + 55);
    hudCtx.textAlign = 'left';
  }`,
  'Fix 3: Kill flash + KILL text'
);

// ════════════════════════════════════════════════════
//  FIX 4: Streak visual escalation — scaling font, pulse, milestones
// ════════════════════════════════════════════════════
safeReplace(
  `// Kill streak
  if (c.streak >= 3) {
    const streakColor = c.streak >= 10 ? '#ff2200' : c.streak >= 5 ? '#ffcc00' : '#ff8800';
    hudCtx.font = 'bold 14px "Segoe UI"'; hudCtx.fillStyle = streakColor;
    hudCtx.fillText('\\u2605 STREAK x' + c.streak + ' (' + c.streakMultiplier + 'x)', srx, sry+78);
  }`,
  `// Kill streak — escalating visual drama
  if (c.streak >= 3) {
    const streakColor = c.streak >= 20 ? '#ff0000' : c.streak >= 15 ? '#ff2200' : c.streak >= 10 ? '#ff4400' : c.streak >= 5 ? '#ffcc00' : '#ff8800';
    const streakSize = Math.min(28, 14 + Math.floor(c.streak / 3) * 2);
    const pulse = 1 + 0.08 * Math.sin(state.gameTime * 0.012);
    hudCtx.save();
    hudCtx.font = 'bold ' + Math.round(streakSize * pulse) + 'px "Segoe UI"'; hudCtx.fillStyle = streakColor;
    hudCtx.globalAlpha = 0.9;
    // Glow
    hudCtx.shadowColor = streakColor; hudCtx.shadowBlur = c.streak >= 10 ? 12 : 4;
    hudCtx.fillText('\\u2605 STREAK x' + c.streak + ' (' + c.streakMultiplier + 'x)', srx, sry+78);
    // Milestone flash (fades over 1.5s)
    if (c._streakMilestoneTimer > 0) {
      hudCtx.globalAlpha = Math.min(1, c._streakMilestoneTimer / 600);
      const mSize = 24 + (1 - c._streakMilestoneTimer / 1500) * 8;
      hudCtx.font = 'bold ' + Math.round(mSize) + 'px "Segoe UI"';
      hudCtx.fillStyle = '#ffffff'; hudCtx.shadowColor = streakColor; hudCtx.shadowBlur = 20;
      hudCtx.textAlign = 'center';
      hudCtx.fillText(c._streakMilestoneText || '', cx, cy - 80);
      hudCtx.textAlign = 'left';
    }
    hudCtx.restore();
  }`,
  'Fix 4: Streak visual escalation'
);

// Now add milestone tracking to the streak increment code
safeReplace(
  `c.streak++; c.streakTimer = 5000;
            c.streakMultiplier = c.streak >= 20 ? 4 : c.streak >= 15 ? 3.5 : c.streak >= 10 ? 3 : c.streak >= 5 ? 2 : c.streak >= 3 ? 1.5 : 1;`,
  `c.streak++; c.streakTimer = 5000;
            c.streakMultiplier = c.streak >= 20 ? 4 : c.streak >= 15 ? 3.5 : c.streak >= 10 ? 3 : c.streak >= 5 ? 2 : c.streak >= 3 ? 1.5 : 1;
            // Streak milestone announcements
            const _milestones = {5:'RAMPAGE!',10:'UNSTOPPABLE!',15:'GODLIKE!',20:'LEGENDARY!'};
            if (_milestones[c.streak]) { c._streakMilestoneText = _milestones[c.streak]; c._streakMilestoneTimer = 1500; AudioSFX.play('quest_complete'); }`,
  'Fix 4b: Streak milestone announcements'
);

// ════════════════════════════════════════════════════
//  FIX 5: Low health warning — HULL CRITICAL text + alarm + stronger vignette
// ════════════════════════════════════════════════════
safeReplace(
  `if (hullPct < 0.25) {
    vigGrad.addColorStop(1, 'rgba(255,0,0,' + (0.15 + Math.sin(performance.now()*0.005)*0.05) + ')');
  } else {`,
  `if (hullPct < 0.25) {
    // Escalating red vignette: 25%→0.2, 10%→0.35, 5%→0.45
    const dangerIntensity = 0.15 + (1 - hullPct / 0.25) * 0.3;
    vigGrad.addColorStop(1, 'rgba(255,0,0,' + (dangerIntensity + Math.sin(performance.now()*0.008)*0.06) + ')');
  } else {`,
  'Fix 5a: Stronger low-hull vignette'
);

// Add HULL CRITICAL text to HUD (after the shield break warning section)
safeReplace(
  `// Shield break warning
  if (c.shieldBreakTimer > 0) {
    hudCtx.save();
    hudCtx.globalAlpha = Math.min(1, c.shieldBreakTimer / 500) * (0.6 + 0.4 * Math.sin(state.gameTime * 0.015));
    hudCtx.font = 'bold 14px "Segoe UI"';
    hudCtx.fillStyle = '#ff2200';
    hudCtx.fillText('\\u26A0 SHIELDS DOWN', slx, sly + 60);
    hudCtx.restore();
  }`,
  `// Shield break warning
  if (c.shieldBreakTimer > 0) {
    hudCtx.save();
    hudCtx.globalAlpha = Math.min(1, c.shieldBreakTimer / 500) * (0.6 + 0.4 * Math.sin(state.gameTime * 0.015));
    hudCtx.font = 'bold 16px "Segoe UI"';
    hudCtx.fillStyle = '#44ccff';
    hudCtx.shadowColor = '#44ccff'; hudCtx.shadowBlur = 12;
    hudCtx.fillText('\\u26A0 SHIELDS DOWN', slx, sly + 60);
    hudCtx.restore();
  }
  // HULL CRITICAL warning — flashing text + alarm beep
  if (hullPct < 0.3 && !c.dead) {
    hudCtx.save();
    const hullWarnAlpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.01);
    hudCtx.globalAlpha = hullWarnAlpha;
    hudCtx.font = 'bold 20px "Segoe UI"';
    hudCtx.fillStyle = '#ff2200';
    hudCtx.shadowColor = '#ff0000'; hudCtx.shadowBlur = 15;
    hudCtx.textAlign = 'center';
    const hullWarnText = hullPct < 0.1 ? '\\u26A0 HULL CRITICAL \\u26A0' : '\\u26A0 HULL LOW';
    hudCtx.fillText(hullWarnText, cx, H - 100);
    hudCtx.textAlign = 'left';
    hudCtx.restore();
    // Periodic warning beep (every 1.5s, faster at <15%)
    const hullBeepInterval = hullPct < 0.15 ? 800 : 1500;
    if (!c._lastHullWarnBeep || performance.now() - c._lastHullWarnBeep > hullBeepInterval) {
      c._lastHullWarnBeep = performance.now();
      AudioSFX.play('shield_hit');
    }
  }`,
  'Fix 5b: HULL CRITICAL text + alarm beep'
);

// ════════════════════════════════════════════════════
//  FIX 6: Boss warn SFX louder + double beep
// ════════════════════════════════════════════════════
safeReplace(
  `case 'boss_warn': osc.type = 'square'; osc.frequency.setValueAtTime(220, now); osc.frequency.setValueAtTime(280, now+0.2); osc.frequency.setValueAtTime(220, now+0.4); gain.gain.setValueAtTime(0.1, now); gain.gain.setValueAtTime(0.001, now+0.6); osc.start(now); osc.stop(now+0.6); break;`,
  `case 'boss_warn': { osc.type = 'square'; osc.frequency.setValueAtTime(220, now); osc.frequency.setValueAtTime(280, now+0.15); osc.frequency.setValueAtTime(220, now+0.3); gain.gain.setValueAtTime(0.18*vol, now); gain.gain.setValueAtTime(0.001, now+0.45); osc.start(now); osc.stop(now+0.45); const bw2=ctx.createOscillator(); bw2.type='square'; bw2.frequency.setValueAtTime(280,now+0.55); bw2.frequency.setValueAtTime(350,now+0.7); bw2.frequency.setValueAtTime(280,now+0.85); const bg2=ctx.createGain(); bg2.connect(ctx.destination); bg2.gain.setValueAtTime(0.001,now); bg2.gain.setValueAtTime(0.16*vol,now+0.55); bg2.gain.setValueAtTime(0.001,now+1.0); bw2.connect(bg2); bw2.start(now+0.55); bw2.stop(now+1.0); break; }`,
  'Fix 6: Boss warn louder + double beep'
);

// ════════════════════════════════════════════════════
//  FIX 7: Boss explosion multi-stage
// ════════════════════════════════════════════════════
safeReplace(
  `if (e.isBoss) { c.bossActive = false; state.player.lifetimeStats.bossKills++; addComms('AI Director', 'Boss destroyed! +500 points'); }`,
  `if (e.isBoss) {
              c.bossActive = false; state.player.lifetimeStats.bossKills++;
              addComms('AI Director', 'Boss destroyed! +500 points');
              // Multi-stage boss explosion — 3 staggered blasts
              const bossPos = e.group.position.clone();
              setTimeout(() => spawnExplosion(bossPos.clone().add(new THREE.Vector3(Math.random()*6-3,Math.random()*6-3,Math.random()*6-3)), (e.cfg.scale||1)*1.5), 200);
              setTimeout(() => { spawnExplosion(bossPos.clone().add(new THREE.Vector3(Math.random()*8-4,Math.random()*8-4,Math.random()*8-4)), (e.cfg.scale||1)*2); AudioSFX.play('explode'); }, 500);
              c.damageFlash = 500;
            }`,
  'Fix 7: Boss explosion multi-stage'
);

// ════════════════════════════════════════════════════
//  FIX 8: Damage numbers — size scales with value + faster float
// ════════════════════════════════════════════════════
safeReplace(
  `hudCtx.globalAlpha = Math.max(0, 1 - dn.age / 1200);
      hudCtx.font = 'bold 16px "Segoe UI"'; hudCtx.fillStyle = dn.color;
      hudCtx.fillText(dn.text, sx, sy);
    }
    if (dn.age > 1200) c.dmgNumbers.splice(i, 1);`,
  `hudCtx.globalAlpha = Math.max(0, 1 - dn.age / 1200);
      // Scale font size by numeric value — bigger numbers = bigger text
      const dnVal = Math.abs(parseFloat(dn.text)) || 0;
      const dnSize = Math.min(26, 14 + Math.floor(dnVal / 50) * 2);
      // Initial pop: 1.3x at age 0, settles to 1x at age 200
      const dnPop = dn.age < 200 ? 1 + 0.3 * (1 - dn.age / 200) : 1;
      hudCtx.font = 'bold ' + Math.round(dnSize * dnPop) + 'px "Segoe UI"'; hudCtx.fillStyle = dn.color;
      hudCtx.fillText(dn.text, sx, sy);
    }
    if (dn.age > 1200) c.dmgNumbers.splice(i, 1);`,
  'Fix 8: Damage numbers scale + pop'
);

// Also make damage numbers float faster
safeReplace(
  `const sy = (-screenPos.y * 0.5 + 0.5) * H - dn.age * 0.05;`,
  `const sy = (-screenPos.y * 0.5 + 0.5) * H - dn.age * 0.08;`,
  'Fix 8b: Faster damage number float'
);

// ════════════════════════════════════════════════════
//  FIX 9: Streak milestone timer decay in HUD update
// ════════════════════════════════════════════════════
// Add milestone timer decay where streakTimer is decayed
safeReplace(
  `c.streakTimer -= dtMs;
      if (c.streakTimer <= 0) { c.streak = 0; c.streakMultiplier = 1; }
    }`,
  `c.streakTimer -= dtMs;
      if (c.streakTimer <= 0) { c.streak = 0; c.streakMultiplier = 1; }
      if (c._streakMilestoneTimer > 0) c._streakMilestoneTimer -= dtMs;
    }`,
  'Fix 9: Streak milestone timer decay'
);


// ════════════════════════════════════════════════════
//  BALANCE CHECK
// ════════════════════════════════════════════════════
const after = countBraces(src);
const db = after.b - before.b;
const dp = after.p - before.p;
const dk = after.k - before.k;

console.log(`\n=== Audit 15: Visual Juice + Sound Design ===`);
console.log(`Applied: ${applied}/13, Failed: ${failed}`);
console.log(`Balance delta — B:${db} P:${dp} K:${dk}`);
if (db !== 0 || dp !== 0 || dk !== 0) {
  console.log('\u274c BALANCE ERROR — aborting write');
  process.exit(1);
}
if (failed > 0) {
  console.log('\u274c SOME FIXES FAILED — aborting write');
  process.exit(1);
}
fs.writeFileSync(FILE, src);
console.log(`\u2705 File written. Size: ${origLen} \u2192 ${src.length} (+${src.length - origLen})`);
