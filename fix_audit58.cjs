/**
 * Audit 58 — 9 fixes: rebirth sync, save integrity, fog/background reset,
 * transition safety, soulFragments cap, tutorial timeout leak, payload validation
 */
const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let errors = 0;
let applied = 0;

function patch(filePath, oldStr, newStr, label) {
  let src = fs.readFileSync(filePath, 'utf8');
  const target = cr(oldStr);
  const idx = src.indexOf(target);
  if (idx === -1) {
    console.error(`FAIL [${label}] — anchor not found in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  if (src.indexOf(target, idx + 1) !== -1) {
    console.error(`FAIL [${label}] — anchor is ambiguous (multiple matches) in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  src = src.slice(0, idx) + cr(newStr) + src.slice(idx + target.length);
  fs.writeFileSync(filePath, src, 'utf8');
  applied++;
  console.log(`OK   [${label}]`);
}

const HTML = path.join(__dirname, 'public', 'index.html');
const IDX = path.join(__dirname, 'src', 'core', 'index.js');

// ═══════════════════════════════════════════════════════════════════════
// FIX 1 (CRITICAL): Karma accept — sync rebirth identity to server
// After saveGame(), emit rebirth:sync so server updates in-memory player
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  saveGame();
  state.karmaRoll = null;
  updateRebirthScreen();`,
  `  saveGame();
  // Sync new identity to server (karma roll is client-side)
  if (state.socket) state.socket.emit('rebirth:sync', { name: roll.name, faction: roll.faction, genome: roll.genome });
  state.karmaRoll = null;
  updateRebirthScreen();`,
  'Fix1-karma-rebirth-sync'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 2 (HIGH): Server rebirth:perform — update player.name/faction
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `    player.genome = Array.from(chosenNpc.genome);
    // Mark chosen NPC as player avatar
    chosenNpc.isPlayerAvatar = true;`,
  `    player.genome = Array.from(chosenNpc.genome);
    player.name = chosenNpc.name || player.name;
    player.faction = chosenNpc.faction || player.faction;
    // Mark chosen NPC as player avatar
    chosenNpc.isPlayerAvatar = true;`,
  'Fix2-server-rebirth-name-faction'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 2b (NEW): Server — add rebirth:sync handler for karma wheel flow
// Insert after the rebirth:perform close bracket
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `    } catch (err) { console.error('[Socket] rebirth:perform error:', err.message); }
  });

  socket.on('starmap:request', () => {`,
  `    } catch (err) { console.error('[Socket] rebirth:perform error:', err.message); }
  });

  // Karma wheel sync — client sends rolled identity after karma accept
  socket.on('rebirth:sync', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      if (!data || typeof data !== 'object') return;
      if (typeof data.name === 'string') player.name = data.name.slice(0, 50);
      if (typeof data.faction === 'string') player.faction = data.faction.slice(0, 50);
      if (Array.isArray(data.genome) && data.genome.length === 7) player.genome = data.genome.map(Number);
      player.activeQuests.clear();
      player.visitedSystems.clear();
      player.trades = 0;
      player.cargo.clear();
    } catch (err) { console.error('[Socket] rebirth:sync error:', err.message); }
  });

  socket.on('starmap:request', () => {`,
  'Fix2b-server-rebirth-sync-handler'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 3 (HIGH): Disconnect auto-save — include cargo/quests/visitedSystems
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `      await fileStore.save(player.playerId, {
          playerId: player.playerId,
          name: player.name,
          faction: player.faction,
          genome: player.genome,
          wallet: { ec: wallet.ec, sm: wallet.sm },
          trades: player.trades,
          savedAt: Date.now(),
        });`,
  `      await fileStore.save(player.playerId, {
          playerId: player.playerId,
          name: player.name,
          faction: player.faction,
          genome: player.genome,
          wallet: { ec: wallet.ec, sm: wallet.sm },
          trades: player.trades,
          cargo: [...player.cargo.entries()],
          activeQuests: [...player.activeQuests.entries()],
          visitedSystems: [...player.visitedSystems],
          savedAt: Date.now(),
        });`,
  'Fix3-disconnect-save-maps'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 4+10 (HIGH): game:save — expand whitelist + payload size validation
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `      // Allow non-authoritative display data (position, settings, etc.)
      if (data && typeof data === 'object') {
        for (const key of ['position', 'rotation', 'currentSystem', 'settings']) {
          if (data[key] !== undefined) serverState[key] = data[key];
        }
      }`,
  `      // Allow non-authoritative display data (position, settings, etc.)
      if (data && typeof data === 'object') {
        // Payload size guard — reject excessively large saves (> 512 KB)
        const payloadSize = JSON.stringify(data).length;
        if (payloadSize > 524288) {
          socket.emit('game:saved', { ok: false, error: 'Payload too large' });
          return;
        }
        const allowedKeys = ['position', 'rotation', 'currentSystem', 'settings',
          'combat', 'inventory', 'quests', 'upgrades', 'flight', 'pastLives',
          'skills', 'soulMemory', 'economy', 'activeWeapon', 'persistentItems',
          'currentSkin', 'market', 'insuredItemId', 'chatbot', 'factionRep',
          'ship', 'location', 'player'];
        for (const key of allowedKeys) {
          if (data[key] !== undefined) serverState[key] = data[key];
        }
      }`,
  'Fix4+10-save-whitelist-payload-cap'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 5 (MEDIUM): exitGunnerMode — reset fog and background to defaults
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  stopMining();
  state.mining.active = false;
  c.bossActive = false;`,
  `  // Reset fog and background to default ambient values (combat sets dense fog)
  scene.fog = new THREE.FogExp2(0x050510, 0.00012);
  scene.background = null;
  stopMining();
  state.mining.active = false;
  c.bossActive = false;`,
  'Fix5-fog-background-reset'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 6 (MEDIUM): showScreen — try/finally around setTimeout callback
// so _transitioning flag is always cleared even if _showScreenInner throws
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `    setTimeout(() => { _showScreenInner(name); _overlay.classList.remove('active'); _transitioning = false; }, dur);`,
  `    setTimeout(() => { try { _showScreenInner(name); } finally { _overlay.classList.remove('active'); _transitioning = false; } }, dur);`,
  'Fix6-transitioning-try-finally'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 7 (MEDIUM): soulFragments — cap at 100 entries
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  p.soulFragments.push(fragment);
  // Update lifetime stats`,
  `  p.soulFragments.push(fragment);
  // Cap fragments to prevent unbounded localStorage growth
  if (p.soulFragments.length > 100) p.soulFragments.splice(0, p.soulFragments.length - 100);
  // Update lifetime stats`,
  'Fix7-soulFragments-cap'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 8 (LOW): Tutorial timeouts — push instead of overwrite
// The first-life tutorial code overwrites c._tutorialTimeouts = [...],
// losing any cutscene timeouts (_t1/_t2) added just above
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `    c._tutorialTimeouts = [
      setTimeout(() => { if (c.active) addComms('EDEN AI', '\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'); }, 3000),`,
  `    if (!c._tutorialTimeouts) c._tutorialTimeouts = [];
    c._tutorialTimeouts.push(
      setTimeout(() => { if (c.active) addComms('EDEN AI', '\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'); }, 3000),`,
  'Fix8-tutorial-timeout-push-start'
);

// Close the push() instead of the array literal
patch(HTML,
  `      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Your genome shapes your potential. Trade, fight, and explore to grow skills.'); }, 60000),
    ];
  }
}`,
  `      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Your genome shapes your potential. Trade, fight, and explore to grow skills.'); }, 60000),
    );
  }
}`,
  'Fix8-tutorial-timeout-push-end'
);

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log(`\n=== Audit 58 patch: ${applied} applied, ${errors} failed ===`);
if (errors > 0) { process.exit(1); }
