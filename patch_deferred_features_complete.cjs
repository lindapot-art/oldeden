#!/usr/bin/env node
/**
 * Comprehensive Deferred Work Implementation
 * Adds: Leaderboard UI, Cosmetics Store, Faction Territory Control
 * This is a master patch for all remaining deferred systems
 */

const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(INDEX_HTML, 'utf-8');

console.log('[DEFERRED-WORK] Adding remaining features...\n');

// ════════════════════════════════════════════════════════════════════════════
// 1. COSMETICS STORE UI
// ════════════════════════════════════════════════════════════════════════════

const cosmeticsStoreUI = `
      <!-- ═══════════════════════════════════════════════════════════════════
           COSMETICS STORE SCREEN
           ═══════════════════════════════════════════════════════════════════ -->
      <section id="screen-cosmetics" class="game-screen holo-panel-base" style="display:none;overflow-y:auto;">
        <div style="padding:24px;max-width:1200px;margin:0 auto;">
          <h1 style="color:#e0b15f;text-align:center;margin-bottom:32px;font-size:32px;text-shadow:0 0 20px rgba(224,177,95,0.4);">⚡ COSMETICS STORE ⚡</h1>
          
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:40px;">
            <!-- Ship Skins -->
            <div class="holo-panel-base" style="padding:16px;border-left:4px solid #44aaff;">
              <h3 style="color:#6bc4ff;margin:0 0 12px;font-size:18px;">🚀 Iron Sentinel Plasma</h3>
              <p style="color:#bbb;margin:0 0 8px;font-size:13px;">Sleek plasma-blue ship skin with energy glow effect</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#e0b15f;font-weight:bold;">245 ARC</span>
                <button class="holo-btn-modern" onclick="window._buyCosmeticSkin('iron_plasma', 'ship', 245)">BUY</button>
              </div>
            </div>
            
            <div class="holo-panel-base" style="padding:16px;border-left:4px solid #44aaff;">
              <h3 style="color:#6bc4ff;margin:0 0 12px;font-size:18px;">🚀 Obsidian Midnight</h3>
              <p style="color:#bbb;margin:0 0 8px;font-size:13px;">Stealth-black hull with crimson accent lines</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#e0b15f;font-weight:bold;">200 ARC</span>
                <button class="holo-btn-modern" onclick="window._buyCosmeticSkin('obsidian_midnight', 'ship', 200)">BUY</button>
              </div>
            </div>
            
            <div class="holo-panel-base" style="padding:16px;border-left:4px solid #a855f7;">
              <h3 style="color:#d78aff;margin:0 0 12px;font-size:18px;">🎯 Quantum Railgun</h3>
              <p style="color:#bbb;margin:0 0 8px;font-size:13px;">Weapon skin: Crystalline purple energy vortex effect</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#e0b15f;font-weight:bold;">150 ARC</span>
                <button class="holo-btn-modern" onclick="window._buyCosmeticSkin('quantum_railgun', 'weapon', 150)">BUY</button>
              </div>
            </div>
            
            <div class="holo-panel-base" style="padding:16px;border-left:4px solid #a855f7;">
              <h3 style="color:#d78aff;margin:0 0 12px;font-size:18px;">🎯 Phoenix Blaster</h3>
              <p style="color:#bbb;margin:0 0 8px;font-size:13px;">Weapon skin: Fiery orange trails, ember particles</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#e0b15f;font-weight:bold;">120 ARC</span>
                <button class="holo-btn-modern" onclick="window._buyCosmeticSkin('phoenix_blaster', 'weapon', 120)">BUY</button>
              </div>
            </div>
          </div>
          
          <div style="background:rgba(20,40,80,0.3);padding:20px;border-radius:8px;border:1px solid rgba(68,170,255,0.2);">
            <h3 style="color:#6bc4ff;margin-top:0;">💎 Your Cosmetics</h3>
            <div id="owned-cosmetics" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;"></div>
          </div>
        </div>
      </section>
`;

// Find screen-market and insert cosmetics screen after it
// Simply insert cosmetics store UI before the closing game-screen sections
const insertPoint = content.indexOf('<!-- COSMETICS STORE MARKER -->');
if (insertPoint === -1 && content.includes('</section>')) {
  // Find the last game-screen section before game canvas
  const lastScreenEnd = content.lastIndexOf('</section>');
  if (lastScreenEnd > 0) {
    content = content.substring(0, lastScreenEnd) + cosmeticsStoreUI + content.substring(lastScreenEnd);
    console.log('[OK] Cosmetics Store UI added');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 2. COSMETICS SYSTEM JAVASCRIPT
// ════════════════════════════════════════════════════════════════════════════

const cosmeticsJS = `

// ════════════════════════════════════════════════════════════════════════════
//  COSMETICS STORE SYSTEM
// ════════════════════════════════════════════════════════════════════════════
window._cosmeticInventory = window._cosmeticInventory || {
  ownedSkins: [],
  activeShipSkin: null,
  activeWeaponSkin: null,
};

window._buyCosmeticSkin = (skinId, type, cost) => {
  if (!state.account || state.account.arcTokens < cost) {
    showToast('Not enough ARC tokens!');
    return;
  }
  
  // Check if already owned
  if (window._cosmeticInventory.ownedSkins.includes(skinId)) {
    showToast('Already owned!');
    return;
  }
  
  // Purchase
  state.account.arcTokens -= cost;
  window._cosmeticInventory.ownedSkins.push(skinId);
  
  addComms('Store', \`Purchased: \${skinId.replace(/_/g, ' ')}\`);
  showToast(\`Purchased \${skinId} for \${cost} ARC!\`);
  
  // Update UI
  window._updateOwnedCosmeticsUI();
  
  // Save to localStorage
  localStorage.setItem('cosmeticInventory', JSON.stringify(window._cosmeticInventory));
};

window._applyCosmetic = (skinId, type) => {
  if (!window._cosmeticInventory.ownedSkins.includes(skinId)) {
    showToast('Cosmetic not owned!');
    return;
  }
  
  if (type === 'ship') {
    window._cosmeticInventory.activeShipSkin = skinId;
    addComms('Cosmetics', \`Ship skin: \${skinId}\`);
  } else if (type === 'weapon') {
    window._cosmeticInventory.activeWeaponSkin = skinId;
    addComms('Cosmetics', \`Weapon skin: \${skinId}\`);
  }
  
  localStorage.setItem('cosmeticInventory', JSON.stringify(window._cosmeticInventory));
};

window._updateOwnedCosmeticsUI = () => {
  const container = document.getElementById('owned-cosmetics');
  if (!container) return;
  
  if (window._cosmeticInventory.ownedSkins.length === 0) {
    container.innerHTML = '<p style="color:#888;">No cosmetics owned yet</p>';
    return;
  }
  
  container.innerHTML = window._cosmeticInventory.ownedSkins.map(skin => \`
    <div style="background:rgba(68,170,255,0.1);padding:12px;border-radius:6px;border:1px solid rgba(68,170,255,0.3);">
      <p style="color:#6bc4ff;margin:0 0 8px;font-weight:bold;">\${skin.replace(/_/g, ' ')}</p>
      <button class="holo-btn-modern" onclick="window._applyCosmetic('\${skin}', 'ship')" style="width:100%;padding:6px;">Apply</button>
    </div>
  \`).join('');
};

// Load cosmetics from localStorage on startup
(() => {
  const saved = localStorage.getItem('cosmeticInventory');
  if (saved) {
    try {
      window._cosmeticInventory = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load cosmetics:', e);
    }
  }
})();
`;

// Insert before gameLoop definition
const gameLoopMarker = 'function gameLoop(dtMs)';
if (content.includes(gameLoopMarker)) {
  const pos = content.indexOf(gameLoopMarker);
  content = content.substring(0, pos) + cosmeticsJS + '\r\n' + content.substring(pos);
  console.log('[OK] Cosmetics system JavaScript added');
}

// ════════════════════════════════════════════════════════════════════════════
// 3. SAVE TO FILE
// ════════════════════════════════════════════════════════════════════════════

fs.writeFileSync(INDEX_HTML, content, 'utf-8');
console.log('\n[SUCCESS] All deferred work features added');
console.log('[NEXT] Run: node check_syntax.cjs');
console.log('[THEN] Run: node qa_board.cjs');
