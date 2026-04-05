const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');
let ok = 0, fail = 0;
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  if (!src.includes(o)) { console.error('FAIL: ' + label); fail++; return; }
  const count = src.split(o).length - 1;
  if (count !== 1) { console.error('FAIL (multiple): ' + label + ' (' + count + ')'); fail++; return; }
  src = src.replace(o, n);
  console.log('OK: ' + label);
  ok++;
}

// ================================================================
// Fix 1: Karma backstory — allow scroll on overflow
// ================================================================
safeReplace(
  `.karma-card.revealed .karma-backstory{max-height:100px;}`,
  `.karma-card.revealed .karma-backstory{max-height:100px;overflow-y:auto;}`,
  'F1: karma backstory scroll on overflow'
);

// ================================================================
// Fix 2: Boss warning overlay — use opacity+visibility for fade transition
// ================================================================
safeReplace(
  `#boss-warning-overlay{position:fixed;inset:0;z-index:16;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(255,0,0,0.08);}
#boss-warning-overlay.active{display:flex;}`,
  `#boss-warning-overlay{position:fixed;inset:0;z-index:16;pointer-events:none;display:flex;opacity:0;visibility:hidden;align-items:center;justify-content:center;flex-direction:column;background:rgba(255,0,0,0.08);transition:opacity 0.4s ease,visibility 0.4s;}
#boss-warning-overlay.active{opacity:1;visibility:visible;}`,
  'F2: boss warning uses opacity/visibility for fade'
);

// ================================================================
// Fix 3: HUD speed bar — correct denominator with all speed multipliers
// ================================================================
safeReplace(
  `  const spdPct = fl.speed / (fl.maxSpeed * fl.afterburnerMult * state.upgrades.engineSpeed);`,
  `  const _fuelPen = state.ship.fuel <= 0 ? 0.3 : 1;
  const spdPct = fl.speed / (fl.maxSpeed * (fl.afterburner ? fl.afterburnerMult : 1) * state.upgrades.engineSpeed * getPlayerSpeedMult() * _fuelPen);`,
  'F3: speed bar denominator matches actual max speed'
);

// ================================================================
// Fix 4: Resonance bar width capped at 100%
// ================================================================
safeReplace(
  `style="width:$` + `{r[it.key] * 2}%;background:$` + `{it.color};"`,
  `style="width:$` + `{Math.min(100, r[it.key] * 2)}%;background:$` + `{it.color};"`,
  'F4: cap resonance bar width at 100%'
);

// ================================================================
// Fix 5: Life insurance — find most valuable item by MARKET_ITEMS basePrice
// ================================================================
safeReplace(
  `  // Insure the most valuable item
  let best = state.inventory[0];
  state.inventory.forEach(item => {
    if ((item.value || 0) > (best.value || 0)) best = item;
  });`,
  `  // Insure the most valuable item (by market base price)
  const _getItemVal = (n) => (MARKET_ITEMS.find(m => m.name === n)?.basePrice || 0);
  let best = state.inventory[0];
  state.inventory.forEach(item => {
    if (_getItemVal(item.name) > _getItemVal(best.name)) best = item;
  });`,
  'F5: life insurance picks most valuable by market price'
);

// ================================================================
// Fix 6: _showScreenInner — exit gunner mode when leaving gunner
// ================================================================
safeReplace(
  `function _showScreenInner(name) {

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));`,
  `function _showScreenInner(name) {
  // Exit gunner if leaving it via nav
  if (state.screen === 'gunner' && name !== 'gunner' && c.active) { exitGunnerMode(true); }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));`,
  'F6: exit gunner mode when navigating away'
);

// ================================================================
// Fix 7: Chatbot keyword matching — use word boundary regex
// ================================================================
safeReplace(
  `  for (const key of sortedKeys) {
    if (lower.includes(key)) {`,
  `  for (const key of sortedKeys) {
    if (new RegExp('\\\\b' + key + '\\\\b').test(lower)) {`,
  'F7: chatbot uses word boundary matching'
);

// ================================================================
// Fix 8: Sell order — return unfilled items after NPC timeout
// ================================================================
safeReplace(
  `    // Refund unfilled buy order portion
    if (_ord && _ord.quantity > 0 && _ord.type === 'buy') {
      const refund = _ord.price * _ord.quantity;
      state.player.credits += refund;
      state.market.orders = state.market.orders.filter(o => o.id !== _orderId);
      if (refund > 0) addComms('Market', 'Order expired. Refunded ' + refund + ' EC for unfilled ' + _ord.item + '.');
    }
    renderMarketScreen();`,
  `    // Refund unfilled buy order portion
    if (_ord && _ord.quantity > 0 && _ord.type === 'buy') {
      const refund = _ord.price * _ord.quantity;
      state.player.credits += refund;
      state.market.orders = state.market.orders.filter(o => o.id !== _orderId);
      if (refund > 0) addComms('Market', 'Order expired. Refunded ' + refund + ' EC for unfilled ' + _ord.item + '.');
    }
    // Return unfilled sell order items to cargo
    if (_ord && _ord.quantity > 0 && _ord.type === 'sell') {
      const _retItem = state.inventory.find(i => i.name === _ord.item);
      if (_retItem) _retItem.quantity += _ord.quantity;
      else state.inventory.push({ name: _ord.item, quantity: _ord.quantity });
      state.market.orders = state.market.orders.filter(o => o.id !== _orderId);
      addComms('Market', 'Sell order expired. ' + _ord.quantity + 'x ' + _ord.item + ' returned to cargo.');
    }
    renderMarketScreen();`,
  'F8: return unfilled sell order items'
);

// ================================================================
// Fix 9: Faction card keyboard accessibility
// ================================================================
safeReplace(
  `    card.addEventListener('click', () => {
      grid.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.player.faction = f.id;
    });
    grid.appendChild(card);`,
  `    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', f.name + ' faction');
    const _selectFaction = () => {
      grid.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.player.faction = f.id;
    };
    card.addEventListener('click', _selectFaction);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _selectFaction(); } });
    grid.appendChild(card);`,
  'F9: faction card keyboard navigation'
);

// ================================================================
// Fix 10: combat:rewarded — direct assignment instead of Math.max
// ================================================================
safeReplace(
  `            state.player.credits = Math.max(state.player.credits, data.wallet.ec);
            state.player.stellarMarks = Math.max(state.player.stellarMarks, data.wallet.sm);`,
  `            state.player.credits = data.wallet.ec;
            state.player.stellarMarks = data.wallet.sm;`,
  'F10: combat:rewarded uses direct server values'
);

// ================================================================
// Fix 11: Shield overflow — damage bleeds through to hull when shield < damage
// Enemy ram (0.5 dmg)
// ================================================================
safeReplace(
  `        if (state.ship.shield > 0) { state.ship.shield = Math.max(0, state.ship.shield - 0.5); AudioSFX.play('shield_hit'); triggerShieldShimmer(); }
        else { state.ship.hull = Math.max(0, state.ship.hull - 0.3); AudioSFX.play('hull_hit'); }`,
  `        const _ramDmg = 0.5;
        if (state.ship.shield > 0) {
          const _absorbed = Math.min(state.ship.shield, _ramDmg);
          state.ship.shield -= _absorbed;
          const _overflow = _ramDmg - _absorbed;
          if (_overflow > 0) state.ship.hull = Math.max(0, state.ship.hull - _overflow * 0.6);
          AudioSFX.play('shield_hit'); triggerShieldShimmer();
        } else { state.ship.hull = Math.max(0, state.ship.hull - _ramDmg * 0.6); AudioSFX.play('hull_hit'); }`,
  'F11a: shield overflow on enemy ram'
);

// Bolt hit
safeReplace(
  `          if (state.ship.shield > 0) { state.ship.shield = Math.max(0, state.ship.shield - dmg); AudioSFX.play('shield_hit'); triggerShieldShimmer(); }
          else { state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5); AudioSFX.play('hull_hit'); }`,
  `          if (state.ship.shield > 0) {
            const _absorbed = Math.min(state.ship.shield, dmg);
            state.ship.shield -= _absorbed;
            const _overflow = dmg - _absorbed;
            if (_overflow > 0) state.ship.hull = Math.max(0, state.ship.hull - _overflow * 0.5);
            AudioSFX.play('shield_hit'); triggerShieldShimmer();
          } else { state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5); AudioSFX.play('hull_hit'); }`,
  'F11b: shield overflow on bolt hit'
);

// Asteroid collision
safeReplace(
  `            if (state.ship.shield > 0) state.ship.shield = Math.max(0, state.ship.shield - dmg);
            else state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5);`,
  `            if (state.ship.shield > 0) {
              const _absorbed = Math.min(state.ship.shield, dmg);
              state.ship.shield -= _absorbed;
              const _overflow = dmg - _absorbed;
              if (_overflow > 0) state.ship.hull = Math.max(0, state.ship.hull - _overflow * 0.5);
            } else { state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5); }`,
  'F11c: shield overflow on asteroid collision'
);

// ================================================================
// Write + verify
// ================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n--- RESULTS ---');
console.log('OK: ' + ok + '  FAIL: ' + fail);
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
console.log('Braces: ' + opens + '/' + closes + (opens === closes ? ' BALANCED' : ' IMBALANCED'));
const lines = src.split('\n').length;
console.log('Lines: ' + lines);
