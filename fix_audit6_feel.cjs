/**
 * Audit 6 — 8 gameplay feel improvements
 * Line-based editing, CRLF-safe
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let lines = fs.readFileSync(FILE, 'utf8').split('\n');
let fixes = 0;

function cr(s) { return s.endsWith('\r') ? s : s + '\r'; }

function findLine(str, startFrom) {
  startFrom = startFrom || 0;
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
}

function insertAfter(name, idx, content) {
  const newLines = content.split('\n').map(cr);
  lines.splice(idx + 1, 0, ...newLines);
  fixes++;
  console.log(`[OK] ${name} (+${newLines.length} after line ${idx + 1})`);
}

function replaceInLine(name, idx, oldStr, newStr) {
  if (!lines[idx].includes(oldStr)) {
    console.error(`[FAIL] ${name} — '${oldStr.substring(0, 50)}' not at line ${idx + 1}`);
    console.error(`  Got: ${lines[idx].trimEnd().substring(0, 120)}`);
    process.exit(1);
  }
  lines[idx] = lines[idx].replace(oldStr, newStr);
  fixes++;
  console.log(`[OK] ${name} (line ${idx + 1})`);
}

function replaceRange(name, startIdx, endIdx, content) {
  const newLines = content.split('\n').map(cr);
  lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
  fixes++;
  console.log(`[OK] ${name} (replaced ${endIdx - startIdx + 1} lines with ${newLines.length})`);
}

console.log(`Starting with ${lines.length} lines\n`);

// ============================================================
// FIX 1: Enemy health bars above their heads in renderHUD
// Insert before "// Damage flash" section
// ============================================================
{
  const idx = findLine('// Damage flash', 3900);
  if (idx === -1) { console.error('[FAIL] Damage flash not found in renderHUD'); process.exit(1); }
  
  insertAfter('Enemy health bars above heads', idx - 1,
`  // Enemy health bars (world-space, above each enemy)
  c.enemies.forEach(e => {
    if (!e.group || !e.group.parent) return;
    const ePos = e.group.position.clone();
    ePos.y += (e.cfg.scale || 1) * 4;
    const sp = ePos.project(camera);
    if (sp.z > 1) return;
    const ex = (sp.x * 0.5 + 0.5) * W;
    const ey = (-sp.y * 0.5 + 0.5) * H;
    if (ex < 0 || ex > W || ey < 0 || ey > H) return;
    const dist = e.group.position.distanceTo(ship.position);
    if (dist > 300) return;
    const barW = e.isBoss ? 60 : 36;
    const barH = 4;
    const hpPct = e.hp / e.maxHp;
    const barColor = hpPct > 0.5 ? '#ff4444' : hpPct > 0.25 ? '#ff8800' : '#ffcc00';
    hudCtx.globalAlpha = Math.max(0.4, 1 - dist / 300);
    hudCtx.fillStyle = '#1a1a2a';
    hudCtx.fillRect(ex - barW/2, ey - barH/2, barW, barH);
    hudCtx.fillStyle = barColor;
    hudCtx.fillRect(ex - barW/2, ey - barH/2, barW * hpPct, barH);
    hudCtx.strokeStyle = 'rgba(255,68,68,0.4)';
    hudCtx.lineWidth = 0.5;
    hudCtx.strokeRect(ex - barW/2, ey - barH/2, barW, barH);
    hudCtx.font = '8px "Segoe UI"';
    hudCtx.fillStyle = e.isBoss ? '#ff2200' : '#ff8866';
    hudCtx.textAlign = 'center';
    hudCtx.fillText(e.type.toUpperCase(), ex, ey - barH - 2);
    hudCtx.textAlign = 'left';
    hudCtx.globalAlpha = 1;
  });
`
  );
}

// ============================================================
// FIX 2: Death ticker visible in gunner mode
// ============================================================
{
  const idx = findLine("['bridge','title','eulogy','karma'].includes(name)", 0);
  if (idx === -1) { console.error('[FAIL] death-ticker toggle not found'); process.exit(1); }
  
  replaceInLine('Death ticker in gunner mode', idx,
    "['bridge','title','eulogy','karma'].includes(name)",
    "['bridge','title','eulogy','karma','gunner'].includes(name)"
  );
}

// ============================================================
// FIX 3: Per-hit floating damage numbers
// Insert after hitMarkerTimer = 150
// ============================================================
{
  const idx = findLine('c.hitMarkerTimer = 150;', 0);
  if (idx === -1) { console.error('[FAIL] hitMarkerTimer not found'); process.exit(1); }
  
  insertAfter('Per-hit floating damage numbers', idx,
`          c.dmgNumbers.push({ text: '-' + genomeDmg.toFixed(1), pos: p.group.position.clone(), age: 0, color: '#ff6644' });`
  );
}

// ============================================================
// FIX 4: Camera shake/recoil intensity boost
// ============================================================
{
  // Shake multiplier: 0.02 → 0.08
  const idx = findLine('c.shakeY * 0.02', 0);
  if (idx === -1) { console.error('[FAIL] shakeY * 0.02 not found'); process.exit(1); }
  lines[idx] = lines[idx].replace(/c\.shakeY \* 0\.02/g, 'c.shakeY * 0.08');
  lines[idx] = lines[idx].replace(/c\.shakeX \* 0\.02/g, 'c.shakeX * 0.08');
  fixes++;
  console.log('[OK] Camera shake multiplier 0.02 → 0.08');
  
  // Fire recoil: 0.015 → 0.045
  const idx2 = findLine('c.fireRecoilKick = 0.015', 0);
  if (idx2 !== -1) {
    replaceInLine('Fire recoil boost', idx2, 'c.fireRecoilKick = 0.015', 'c.fireRecoilKick = 0.045');
  }
  
  // Shake intensity: 1.5 → 4.0
  const idx3 = findLine('(c.damageFlash / 200) * 1.5', 0);
  if (idx3 !== -1) {
    replaceInLine('Shake intensity boost', idx3, '(c.damageFlash / 200) * 1.5', '(c.damageFlash / 200) * 4.0');
  }
}

// ============================================================
// FIX 5: Loot drops — add point light + pulse animation
// ============================================================
{
  const idx = findLine('function spawnLootDrop(pos, type)', 0);
  if (idx === -1) { console.error('[FAIL] spawnLootDrop not found'); process.exit(1); }
  
  // Find "g.add(ring);" line inside spawnLootDrop
  const ringIdx = findLine('g.add(ring);', idx);
  if (ringIdx === -1) { console.error('[FAIL] g.add(ring) not found in spawnLootDrop'); process.exit(1); }
  
  insertAfter('Loot drop point light', ringIdx,
`  // Pulsing point light for distance visibility
  const lootLight = new THREE.PointLight(colors[type] || 0xffffff, 2, 25);
  g.add(lootLight);
  g.userData.lootLight = lootLight;
  g.userData.lootMesh = mesh;`
  );
  
  // Add pulse animation in loot update loop
  const loopIdx = findLine("l.group.position.y += Math.sin(l.age * 0.003) * 0.02;", 0);
  if (loopIdx !== -1) {
    insertAfter('Loot drop pulse animation', loopIdx,
`      // Pulse loot glow
      const _lootPulse = 0.5 + 0.5 * Math.sin(l.age * 0.006);
      if (l.group.userData.lootLight) l.group.userData.lootLight.intensity = 1 + _lootPulse * 3;
      if (l.group.userData.lootMesh) l.group.userData.lootMesh.scale.setScalar(0.9 + _lootPulse * 0.3);`
    );
  }
}

// ============================================================
// FIX 6: Boss spawn visual fanfare
// ============================================================
{
  const idx = findLine("c.kills > 0 && c.kills % 20 === 0 && !c.bossActive", 0);
  if (idx === -1) { console.error('[FAIL] boss spawn block not found'); process.exit(1); }
  
  // Find the createBossEnemy() call
  const bossCreateIdx = findLine('createBossEnemy();', idx);
  if (bossCreateIdx === -1) { console.error('[FAIL] createBossEnemy not found'); process.exit(1); }
  
  // Replace the boss spawn block
  const blockStart = idx;
  const blockEnd = bossCreateIdx + 1; // line after createBossEnemy()
  // Find closing brace
  let closingBrace = bossCreateIdx;
  for (let i = bossCreateIdx; i < bossCreateIdx + 3; i++) {
    if (lines[i].trimEnd().replace('\r','').endsWith('}')) { closingBrace = i; break; }
  }
  
  replaceRange('Boss spawn visual fanfare', blockStart, closingBrace,
`      if (c.kills > 0 && c.kills % 20 === 0 && !c.bossActive) {
        c.bossActive = true;
        AudioSFX.play('boss_warn');
        addComms('AI Director', '\u26a0 BOSS DETECTED — massive hostile signature!');
        // Boss warning full-screen overlay
        const bossWarn = document.createElement('div');
        bossWarn.style.cssText = 'position:fixed;inset:0;z-index:16;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(255,0,0,0.08);';
        bossWarn.innerHTML = '<div style="font-size:clamp(2rem,5vw,4rem);color:#ff2200;font-weight:900;letter-spacing:0.3em;text-shadow:0 0 40px rgba(255,34,0,0.8),0 0 80px rgba(255,34,0,0.4);animation:bossWarnPulse 0.3s ease 3">\\u26a0 WARNING \\u26a0</div><div style="font-size:1.2rem;color:#ff8844;letter-spacing:0.2em;margin-top:0.5rem;">MASSIVE HOSTILE SIGNATURE</div>';
        if (!document.getElementById('boss-warn-style')) {
          const st = document.createElement('style'); st.id = 'boss-warn-style';
          st.textContent = '@keyframes bossWarnPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}';
          document.head.appendChild(st);
        }
        document.body.appendChild(bossWarn);
        c.damageFlash = 400;
        setTimeout(() => bossWarn.remove(), 2500);
        createBossEnemy();
      }`
  );
}

// ============================================================
// FIX 7: Wave pacing — breather every 10 kills
// ============================================================
{
  const idx = findLine('const MAX_ENEMIES = 15;', 0);
  if (idx === -1) { console.error('[FAIL] MAX_ENEMIES not found'); process.exit(1); }
  
  // Find the spawn condition line
  const spawnCondIdx = findLine("c.enemies.length < MAX_ENEMIES && state.gameTime - state.lastEnemySpawn > spawnInterval", idx);
  if (spawnCondIdx === -1) { console.error('[FAIL] spawn condition not found'); process.exit(1); }
  
  // Insert wave pacing before the spawn condition
  insertAfter('Wave pacing — breather every 10 kills', spawnCondIdx - 1,
`    // Wave pacing: 4-second breather every 10 kills
    const _inBreather = c.kills > 0 && c.kills % 10 === 0 && c.enemies.length === 0 && !c._breatherDone;
    if (_inBreather && !c._breatherStart) { c._breatherStart = state.gameTime; addComms('EDEN AI', 'Sector clear... for now.'); }
    if (c._breatherStart && state.gameTime - c._breatherStart > 4000) { c._breatherDone = true; c._breatherStart = 0; }
    if (c.kills > 0 && c.kills % 10 !== 0) c._breatherDone = false;`
  );
  
  // Update the spawn condition to check breather
  const newSpawnCondIdx = findLine("c.enemies.length < MAX_ENEMIES && state.gameTime - state.lastEnemySpawn > spawnInterval", idx);
  if (newSpawnCondIdx !== -1) {
    replaceInLine('Wave pacing spawn guard', newSpawnCondIdx,
      'if (c.enemies.length < MAX_ENEMIES',
      'if (!_inBreather && c.enemies.length < MAX_ENEMIES'
    );
  }
}

// ============================================================
// FIX 8: Enhanced hull damage flash
// ============================================================
{
  // Find the damage flash render in HUD (~line 3944 area after our enemy health bars insertion)
  const idx = findLine("// Damage flash", 3900);
  if (idx === -1) { console.error('[FAIL] Damage flash in renderHUD not found'); process.exit(1); }
  
  // Find the full block: if (c.damageFlash > 0) { ... hudCtx.globalAlpha = 1; }
  const ifIdx = findLine('if (c.damageFlash > 0) {', idx);
  if (ifIdx === -1) { console.error('[FAIL] damageFlash if block not found'); process.exit(1); }
  
  // Find closing of this block
  let closeIdx = -1;
  for (let i = ifIdx + 1; i < ifIdx + 10; i++) {
    if (lines[i].includes('hudCtx.globalAlpha = 1;')) { closeIdx = i; break; }
  }
  if (closeIdx === -1) { console.error('[FAIL] damageFlash block end not found'); process.exit(1); }
  // Include the closing brace
  closeIdx += 1; // the `}` after globalAlpha = 1
  
  replaceRange('Enhanced hull damage flash', ifIdx, closeIdx,
`  if (c.damageFlash > 0) {
    const isHullDmg = state.ship.shield <= 0;
    const flashAlpha = isHullDmg ? (c.damageFlash / 200) * 0.4 : (c.damageFlash / 200) * 0.2;
    hudCtx.globalAlpha = flashAlpha;
    hudCtx.fillStyle = isHullDmg ? '#ff2200' : '#ff0000';
    hudCtx.fillRect(0, 0, W, H);
    if (isHullDmg) {
      const vigGrad2 = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.2, cx, cy, Math.max(W,H)*0.55);
      vigGrad2.addColorStop(0, 'rgba(255,0,0,0)');
      vigGrad2.addColorStop(1, 'rgba(255,0,0,' + (flashAlpha * 0.6) + ')');
      hudCtx.fillStyle = vigGrad2;
      hudCtx.fillRect(0, 0, W, H);
    }
    hudCtx.globalAlpha = 1;
  }`
  );
}

// ============================================================
// WRITE
// ============================================================
const output = lines.join('\n');
fs.writeFileSync(FILE, output, 'utf8');
console.log(`\n=== ${fixes} gameplay improvements applied ===`);

// Balance check
let braces = 0, parens = 0;
for (const ch of output) {
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
}
console.log(`Brace balance: ${braces}`);
console.log(`Paren balance: ${parens}`);
console.log(`Total lines: ${lines.length}`);
if (braces !== 0 || parens !== 0) {
  console.error('!!! BALANCE ERROR — DO NOT COMMIT !!!');
  process.exit(1);
}
console.log('Balance OK');
