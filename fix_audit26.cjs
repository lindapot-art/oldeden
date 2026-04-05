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

// ─── Fix 1: Station model dispose on re-enter (GPU leak) ───
safeReplace(
  `  stationModels.forEach(m => scene.remove(m));
  stationModels = [];`,
  `  stationModels.forEach(m => { scene.remove(m); disposeObject(m); });
  stationModels = [];`,
  'Fix1: Station model dispose on re-enter'
);

// ─── Fix 2a: Mining target use object ref instead of index ───
safeReplace(
  `  state.mining.active = true;
  state.mining.target = asteroidIndex;
  state.mining.progress = 0;`,
  `  state.mining.active = true;
  state.mining.targetRef = asteroid;
  state.mining.progress = 0;`,
  'Fix2a: Mining target object ref'
);

// ─── Fix 2b: updateMining use targetRef ───
safeReplace(
  `  const asteroid = c.asteroids[state.mining.target];
  if (!asteroid) { stopMining(); return; }`,
  `  const asteroid = state.mining.targetRef;
  if (!asteroid || !asteroid.parent) { stopMining(); return; }`,
  'Fix2b: updateMining use targetRef'
);

// ─── Fix 2c: Mining complete — indexOf instead of splice by index ───
safeReplace(
  `    scene.remove(asteroid);
    c.asteroids.splice(state.mining.target, 1);
    stopMining();`,
  `    scene.remove(asteroid);
    const _aidx = c.asteroids.indexOf(asteroid);
    if (_aidx >= 0) c.asteroids.splice(_aidx, 1);
    stopMining();`,
  'Fix2c: Mining complete indexOf'
);

// ─── Fix 2d: stopMining use targetRef ───
safeReplace(
  `  state.mining.active = false; state.mining.target = null; state.mining.progress = 0;
}`,
  `  state.mining.active = false; state.mining.targetRef = null; state.mining.progress = 0;
}`,
  'Fix2d: stopMining targetRef'
);

// ─── Fix 3: Market NPC auto-fill player orders ───
safeReplace(
  '  state.market.orders.push({ id: \'player-\' + Date.now(), item, type, price, quantity: qty, trader: state.player.name || \'You\', isNPC: false });\n' +
  '  addComms(\'Market\', `Order placed: $' + '{type} $' + '{qty}x $' + '{item} @ $' + '{price} EC`);\n' +
  '  renderMarketScreen();\n' +
  '};',

  '  const _orderId = \'player-\' + Date.now();\n' +
  '  state.market.orders.push({ id: _orderId, item, type, price, quantity: qty, trader: state.player.name || \'You\', isNPC: false });\n' +
  '  addComms(\'Market\', `Order placed: $' + '{type} $' + '{qty}x $' + '{item} @ $' + '{price} EC`);\n' +
  '  // NPC auto-fill: match player orders against NPC counter-orders\n' +
  '  setTimeout(() => {\n' +
  '    const _ord = state.market.orders.find(o => o.id === _orderId);\n' +
  '    if (!_ord || _ord.quantity <= 0) return;\n' +
  '    const _matches = state.market.orders.filter(o =>\n' +
  '      o.isNPC && o.item === _ord.item &&\n' +
  '      ((_ord.type === \'sell\' && o.type === \'buy\' && o.price >= _ord.price) ||\n' +
  '       (_ord.type === \'buy\' && o.type === \'sell\' && o.price <= _ord.price))\n' +
  '    );\n' +
  '    let _filled = 0;\n' +
  '    for (const m of _matches) {\n' +
  '      const fq = Math.min(_ord.quantity - _filled, m.quantity);\n' +
  '      if (fq <= 0) break;\n' +
  '      _filled += fq;\n' +
  '      m.quantity -= fq;\n' +
  '      if (_ord.type === \'sell\') { state.player.credits += _ord.price * fq; }\n' +
  '      else {\n' +
  '        const _ei = state.inventory.find(i => i.name === _ord.item);\n' +
  '        if (_ei) _ei.quantity += fq;\n' +
  '        else state.inventory.push({ name: _ord.item, quantity: fq });\n' +
  '      }\n' +
  '      state.market.history.push({ item: _ord.item, type: _ord.type, price: _ord.price, quantity: fq, time: Date.now() });\n' +
  '      if (m.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== m.id);\n' +
  '    }\n' +
  '    if (_filled > 0) {\n' +
  '      _ord.quantity -= _filled;\n' +
  '      if (_ord.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== _orderId);\n' +
  '      addComms(\'Market\', \'Order filled: \' + _filled + \'x \' + _ord.item + \' by NPC traders.\');\n' +
  '    }\n' +
  '    renderMarketScreen();\n' +
  '  }, 2000 + Math.random() * 3000);\n' +
  '  renderMarketScreen();\n' +
  '};',
  'Fix3: Market NPC auto-fill orders'
);

// ─── Fix 4: Mining quest offline-only guard ───
safeReplace(
  `      if (q.objectives.every(o => (o.current || 0) >= o.required)) {
        q.completed = true; q.active = false;
        state.player.credits += q.rewards?.credits || 0;
        addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
        AudioSFX.play('quest_complete');
      }
    });
    // Remove asteroid`,
  `      if (q.objectives.every(o => (o.current || 0) >= o.required)) {
        q.completed = true; q.active = false;
        if (!state.socket || !state.connected) { state.player.credits += q.rewards?.credits || 0; }
        addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
        AudioSFX.play('quest_complete');
      }
    });
    // Remove asteroid`,
  'Fix4: Mining quest offline-only guard'
);

// ─── Fix 5: Visit quest offline-only guard ───
safeReplace(
  `    if (q.objectives.every(o => (o.current || 0) >= o.required)) {
      q.completed = true; q.active = false;
      state.player.credits += q.rewards?.credits || 0;
      addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
      AudioSFX.play('quest_complete');
    }
  });
  addComms('Navigation',`,
  `    if (q.objectives.every(o => (o.current || 0) >= o.required)) {
      q.completed = true; q.active = false;
      if (!state.socket || !state.connected) { state.player.credits += q.rewards?.credits || 0; }
      addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
      AudioSFX.play('quest_complete');
    }
  });
  addComms('Navigation',`,
  'Fix5: Visit quest offline-only guard'
);

// ─── Fix 6: Alt universe systems restored on load ───
safeReplace(
  `  if (data.inAltUniverse) {
    state.inAltUniverse = true;
    state.altUniverse = data.altUniverse;
    state._origSystems = data._origSystems;
    state._origSystemIndex = data._origSystemIndex || 0;
  }`,
  `  if (data.inAltUniverse) {
    state.inAltUniverse = true;
    state.altUniverse = data.altUniverse;
    state._origSystems = data._origSystems;
    state._origSystemIndex = data._origSystemIndex || 0;
    if (state.altUniverse && state.altUniverse.systems) {
      state.starSystems = state.altUniverse.systems;
    }
  }`,
  'Fix6: Alt universe systems on load'
);

// ─── Fix 7: Ghost NPC depthWrite false ───
safeReplace(
  `          child.material.transparent = true;
          child.material.opacity = 0.7;
        }
      });
      addComms('Soul Echo',`,
  `          child.material.transparent = true;
          child.material.opacity = 0.7;
          child.material.depthWrite = false;
        }
      });
      addComms('Soul Echo',`,
  'Fix7: Ghost NPC depthWrite false'
);

// ─── Fix 8: Loot drop emissive sphere instead of PointLight ───
safeReplace(
  `  // Pulsing point light for distance visibility
  const lootLight = new THREE.PointLight(colors[type] || 0xffffff, 2, 25);
  g.add(lootLight);
  g.userData.lootLight = lootLight;`,
  `  // Emissive glow sphere — cheaper than PointLight
  const _lootGlowGeo = new THREE.SphereGeometry(2.5, 8, 8);
  const _lootGlowMat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const lootGlow = new THREE.Mesh(_lootGlowGeo, _lootGlowMat);
  g.add(lootGlow);
  g.userData.lootLight = lootGlow;`,
  'Fix8: Loot drop emissive instead of PointLight'
);

// ─── Fix 8b: Loot pulse logic compatible with mesh ───
safeReplace(
  `      if (l.group.userData.lootLight) l.group.userData.lootLight.intensity = 1 + _lootPulse * 3;`,
  `      if (l.group.userData.lootLight) {
        if (l.group.userData.lootLight.isLight) l.group.userData.lootLight.intensity = 1 + _lootPulse * 3;
        else if (l.group.userData.lootLight.material) l.group.userData.lootLight.material.opacity = 0.15 + _lootPulse * 0.2;
      }`,
  'Fix8b: Loot pulse compatible with mesh'
);

// ─── Fix 9: Auto-target tracking fix (remove dead code, clamp) ───
safeReplace(
  `    c.yaw += (targetYaw - 0) * dt * 2;
    c.pitch += (targetPitch - 0) * dt * 2;`,
  `    const _trackSpeed = Math.min(1, dt * 2);
    c.yaw += targetYaw * _trackSpeed;
    c.pitch += targetPitch * _trackSpeed;`,
  'Fix9: Auto-target tracking fix'
);

// ─── Fix 10: Stargate chevron shared geo+mat ───
safeReplace(
  `  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
    const chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    const chev = new THREE.Mesh(chevGeo, chevMat);`,
  `  const _chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
  const _chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chev = new THREE.Mesh(_chevGeo, _chevMat);`,
  'Fix10: Stargate chevron shared geo+mat'
);

// ─── Fix 11: Station procedural shared panel+light geo+mat ───
safeReplace(
  `  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 0.1), new THREE.MeshStandardMaterial({color:0x2244aa,roughness:0.2,metalness:0.5}));
    panel.position.set(Math.cos(angle)*18, Math.sin(angle)*3, Math.sin(angle)*18);
    panel.lookAt(0,0,0);
    g.add(panel);
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.8}));
    light.position.set(Math.cos(angle)*12, 0, Math.sin(angle)*12);
    g.add(light);
  }`,
  `  const _panelGeo = new THREE.BoxGeometry(2, 10, 0.1);
  const _panelMat = new THREE.MeshStandardMaterial({color:0x2244aa,roughness:0.2,metalness:0.5});
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const panel = new THREE.Mesh(_panelGeo, _panelMat);
    panel.position.set(Math.cos(angle)*18, Math.sin(angle)*3, Math.sin(angle)*18);
    panel.lookAt(0,0,0);
    g.add(panel);
  }
  const _lightGeo = new THREE.SphereGeometry(0.3,8,8);
  const _lightMat = new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.8});
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    const light = new THREE.Mesh(_lightGeo, _lightMat);
    light.position.set(Math.cos(angle)*12, 0, Math.sin(angle)*12);
    g.add(light);
  }`,
  'Fix11: Station shared panel+light geo+mat'
);

// ─── Fix 12: disposeObject handles light shadow maps ───
safeReplace(
  `    if (child.isMesh) {
      if (child.geometry && child.geometry !== _boltGeo && child.geometry !== _boltTrailGeo) {
        child.geometry.dispose();
      }
      if (child.material && !child.material._pooled) {
        if (Array.isArray(child.material)) child.material.forEach(m => { if (!m._pooled) m.dispose(); });
        else child.material.dispose();
      }
    }
  });
}`,
  `    if (child.isMesh) {
      if (child.geometry && child.geometry !== _boltGeo && child.geometry !== _boltTrailGeo) {
        child.geometry.dispose();
      }
      if (child.material && !child.material._pooled) {
        if (Array.isArray(child.material)) child.material.forEach(m => { if (!m._pooled) m.dispose(); });
        else child.material.dispose();
      }
    }
    if (child.isLight && child.shadow && child.shadow.map) {
      child.shadow.map.dispose();
    }
  });
}`,
  'Fix12: disposeObject handles light shadows'
);

fs.writeFileSync(file, src, 'utf8');
console.log('\n=== AUDIT 26 RESULT: ' + applied + ' applied, ' + failed + ' failed ===');
const open = (src.match(/\{/g) || []).length;
const close = (src.match(/\}/g) || []).length;
console.log('Braces: { ' + open + ' } ' + close + ' delta=' + (open - close));
