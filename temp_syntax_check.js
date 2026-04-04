
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ================================================================
//  AUDIO SFX SYSTEM
// ================================================================
const AudioSFX = {
  ctx: null,
  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },
  ensure() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  play(type) {
    if (!this.ctx) return;
    this.ensure();
    const ctx = this.ctx;
    const vol = state.settings.masterVol * state.settings.sfxVol;
    if (vol <= 0) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);
    switch(type) {
      case 'fire': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.15); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.15); osc.start(now); osc.stop(now+0.15); break;
      case 'hit': osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now+0.08); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.08); osc.start(now); osc.stop(now+0.08); break;
      case 'explode': { const dur = 0.35; const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length); const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now+dur); src.start(now); return; }
      case 'charge': osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(1200, now+0.6); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.12, now+0.6); osc.start(now); osc.stop(now+0.6); break;
      case 'shield_hit': osc.type = 'sine'; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(400, now+0.2); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.2); osc.start(now); osc.stop(now+0.2); break;
      case 'jump': osc.type = 'sine'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(2000, now+0.5); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.8); osc.start(now); osc.stop(now+0.8); break;
      case 'boss_warn': osc.type = 'square'; osc.frequency.setValueAtTime(220, now); osc.frequency.setValueAtTime(280, now+0.2); osc.frequency.setValueAtTime(220, now+0.4); gain.gain.setValueAtTime(0.1, now); gain.gain.setValueAtTime(0.001, now+0.6); osc.start(now); osc.stop(now+0.6); break;
      case 'quest_complete': osc.type = 'sine'; osc.frequency.setValueAtTime(523, now); osc.frequency.setValueAtTime(659, now+0.15); osc.frequency.setValueAtTime(784, now+0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.5); osc.start(now); osc.stop(now+0.5); break;
    }
  },
  ambience: null,
  bgm: null,
  startAmbience() {
    if (!this.ctx || this.ambience) return;
    this.ensure();
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.008;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
    src.connect(filt); filt.connect(ctx.destination); src.start();
    this.ambience = src;
  },
  startBGM() {
    if (!this.ctx || this.bgm) return;
    this.ensure();
    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.04 * state.settings.masterVol;
    masterGain.connect(ctx.destination);
    // Deep bass drone
    const bass = ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = 55;
    const bassGain = ctx.createGain(); bassGain.gain.value = 0.5;
    bass.connect(bassGain); bassGain.connect(masterGain); bass.start();
    // Mid pad
    const pad = ctx.createOscillator(); pad.type = 'triangle'; pad.frequency.value = 110;
    const padGain = ctx.createGain(); padGain.gain.value = 0.15;
    pad.connect(padGain); padGain.connect(masterGain); pad.start();
    // Slow LFO wobble
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(pad.frequency); lfo.start();
    // Filtered noise layer
    const nBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const nD = nBuf.getChannelData(0);
    for (let i = 0; i < nD.length; i++) nD[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource(); noise.buffer = nBuf; noise.loop = true;
    const nFilt = ctx.createBiquadFilter(); nFilt.type = 'bandpass'; nFilt.frequency.value = 200; nFilt.Q.value = 0.5;
    const nGain = ctx.createGain(); nGain.gain.value = 0.08;
    noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(masterGain); noise.start();
    this.bgm = { bass, pad, lfo, noise, masterGain };
  },
  stopBGM() {
    if (!this.bgm) return;
    try { this.bgm.bass.stop(); this.bgm.pad.stop(); this.bgm.lfo.stop(); this.bgm.noise.stop(); } catch(e) {}
    this.bgm = null;
  },
};

// ================================================================
//  FACTION DATA (mirrors FactionSystem.js)
// ================================================================
const FACTIONS = [
  { id:'terran_dominion',   name:'Terran Dominion',    ideology:'Order',         home:'Sol Sector',       color:'#3B82F6', desc:'Military empire maintaining galactic order from the Core systems.' },
  { id:'free_colonies',     name:'Free Colonies',      ideology:'Liberty',       home:'Frontier Expanse', color:'#22C55E', desc:'Independent settlements valuing freedom above all else.' },
  { id:'syndicate',         name:'Syndicate',          ideology:'Profit',        home:'Nexus Ring',       color:'#EAB308', desc:'Merchant megacorp controlling trade lanes and black markets.' },
  { id:'covenant_of_stars', name:'Covenant of Stars',  ideology:'Faith',         home:'Hallowed Nebula',  color:'#A855F7', desc:'Theocratic order seeking divine truth among the stars.' },
  { id:'void_collective',   name:'Void Collective',    ideology:'Knowledge',     home:'Deep Void',        color:'#06B6D4', desc:'Scientific alliance pushing the boundaries of understanding.' },
  { id:'iron_pact',         name:'Iron Pact',          ideology:'Survival',      home:'Ashfields',        color:'#F97316', desc:'Hardy survivalists thriving where others cannot endure.' },
  { id:'ascendant_order',   name:'Ascendant Order',    ideology:'Transcendence', home:'Luminous Reach',   color:'#EC4899', desc:'Mystics pursuing transhumanist evolution and ascension.' },
  { id:'remnant_clans',     name:'Remnant Clans',      ideology:'Tradition',     home:'Old Territories',  color:'#78716C', desc:'Ancient clans preserving the old ways of pre-diaspora humanity.' },
];

// ================================================================
//  GAME STATE
// ================================================================
const state = {
  screen: 'title',
  connected: false,
  socket: null,
  player: {
    name: '',
    faction: null,
    genome: null,
    credits: 1000,
    stellarMarks: 0,
    rebirths: 0,
    age: 0,
  },
  ship: { hull: 100, maxHull: 100, shield: 100, maxShield: 100, fuel: 100, maxFuel: 100, power: 100 },
  location: { systemIndex: 0, docked: false },
  combat: {
    active: false, enemies: [], projectiles: [], explosions: [],
    ammo: 24, maxAmmo: 24, heat: 0, score: 0, kills: 0, cycle: 1,
    weaponReady: true, charging: false, chargeStart: 0, chargeLevel: 0,
    cooling: false, coolEnd: 0, recoilOffset: 0, recoilVel: 0,
    yaw: 0, pitch: 0, locked: false, damageFlash: 0, dead: false, bossActive: false,
    enemyBolts: [],
    asteroids: [],
    dmgNumbers: [],
    streak: 0, streakTimer: 0, bestStreak: 0, streakMultiplier: 1,
    shakeX: 0, shakeY: 0,
    lootDrops: [],
    spaceDust: [],
    lastAutoSave: 0,
    deathStats: null,
  },
  starSystems: [],
  selectedSystem: null,
  quests: [],
  inventory: [],
  upgrades: {
    railgunDmg: 1,     // multiplier
    shieldRegen: 3,    // per sec
    maxAmmo: 24,
    maxHull: 100,
    maxShield: 100,
    engineSpeed: 1,
  },
  settings: {
    masterVol: 0.7,
    sfxVol: 0.8,
    sensitivity: 5,
    scanlines: true,
    screenShake: true,
  },
  stationPrices: null,
  factionRep: {},
  commsLog: [],
  gameTime: 0,
  lastEnemySpawn: 0,
  // â”€â”€ Alt Universe / Stargate â”€â”€
  altUniverse: null,        // { systems:[], artifacts:[], artifactsCollected:0, artifactsNeeded:3, returnPortal:null }
  inAltUniverse: false,
  // â”€â”€ Mining â”€â”€
  mining: { active: false, target: null, progress: 0, laserBeam: null },
  // â”€â”€ NPC ships â”€â”€
  npcShips: [],
  // â”€â”€ Market â”€â”€
  market: { orders: [], history: [] },
  // â”€â”€ AI Chatbot â”€â”€
  chatbot: { visible: false, messages: [], autoTarget: false, autoMine: false },
  // â”€â”€ Skins â”€â”€
  currentSkin: null,
  // â”€â”€ GLB loaded models cache â”€â”€
  loadedModels: {},
};

// Initialise faction rep at neutral
FACTIONS.forEach(f => { state.factionRep[f.id] = 0; });

// ================================================================
//  SOCKET.IO CONNECTION
// ================================================================
async function connectSocket() {
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
      try {
        const s = io({ reconnection: true, reconnectionDelay: 3000 });
        s.on('connect', () => {
          state.connected = true;
          updateServerStatus(true);
        });
        s.on('disconnect', () => {
          state.connected = false;
          updateServerStatus(false);
        });
        s.on('game:init', (data) => {
          addComms('AI Director', `${data.systems.length} systems online. Tick rate: ${data.tickRate}ms`);
        });
        s.on('character:created', (data) => {
          state.player.serverId = data.id;
          if (data.wallet) {
            state.player.credits = data.wallet.ec;
            state.player.stellarMarks = data.wallet.sm;
          }
          addComms('System', `Pilot ${data.name} registered (${data.id.slice(0,8)})`);
        });
        // Combat reward from server
        s.on('combat:rewarded', (data) => {
          if (data.wallet) {
            state.player.credits = data.wallet.ec;
            state.player.stellarMarks = data.wallet.sm;
          }
          showToast(`+${data.reward} EC bounty (${data.enemyType})`);
          // Update quest progress on client
          if (data.questUpdates) {
            data.questUpdates.forEach(qu => {
              const q = state.quests.find(q => q.id === qu.questId);
              if (q) q.objectives = qu.objectives;
            });
          }
          if (state.screen === 'bridge') updateBridgeUI();
        });
        // Quest events
        s.on('quest:accepted', (data) => {
          addComms('Mission Board', `Accepted: ${data.quest.name}`);
          const existing = state.quests.find(q => q.id === data.questId);
          if (existing) { existing.active = true; existing.objectives = data.quest.objectives; }
          else state.quests.push({ id: data.questId, title: data.quest.name, active: true, objectives: data.quest.objectives, reward: data.quest.rewards?.credits || 0 });
          if (state.screen === 'bridge') updateBridgeUI();
        });
        s.on('quest:complete', (data) => {
          if (data.wallet) { state.player.credits = data.wallet.ec; state.player.stellarMarks = data.wallet.sm; }
          const q = state.quests.find(q => q.id === data.questId);
          if (q) { q.active = false; q.completed = true; }
          showToast(`Quest complete! +${data.rewards?.credits || 0} EC`);
          AudioSFX.play('quest_complete');
          addComms('Mission Board', `Mission complete! Reward: ${data.rewards?.credits || 0} EC`);
          if (state.screen === 'bridge') updateBridgeUI();
        });
        s.on('quest:error', (data) => { addComms('System', data.error); });
        // Station events
        s.on('station:prices', (data) => {
          state.stationPrices = data.prices;
          if (state.screen === 'station') renderStation();
        });
        s.on('station:bought', (data) => {
          if (data.wallet) { state.player.credits = data.wallet.ec; state.player.stellarMarks = data.wallet.sm; }
          state.inventory.push({ name: data.name, quantity: 1 });
          addComms('Station', `Purchased ${data.name} for ${data.price} EC`);
          if (state.screen === 'station') renderStation();
        });
        s.on('station:sold', (data) => {
          if (data.wallet) { state.player.credits = data.wallet.ec; state.player.stellarMarks = data.wallet.sm; }
          addComms('Station', `Sold ${data.name} for ${data.price} EC`);
          if (state.screen === 'station') renderStation();
        });
        s.on('station:error', (data) => { addComms('Station', data.error); });
        // Save/Load
        s.on('game:saved', (data) => {
          if (data.ok) { state.player.serverId = data.playerId; addComms('System', 'Game saved to server.'); }
        });
        s.on('game:loaded', (data) => {
          if (data.ok && data.data) {
            loadFromServerData(data.data);
            addComms('System', 'Game loaded from server.');
            showScreen('bridge');
          }
        });
        // Player state sync
        s.on('player:state', (data) => {
          if (data.wallet) { state.player.credits = data.wallet.ec; state.player.stellarMarks = data.wallet.sm; }
        });
        // Rebirth result
        s.on('rebirth:result', (data) => {
          state.player.genome = data.genome;
          state.player.rebirths++;
          state.player.credits = data.wallet.ec;
          state.player.stellarMarks = data.wallet.sm;
          state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1;
          state.ship = { hull: 100, maxHull: 100, shield: 100, maxShield: 100, fuel: 100, maxFuel: 100, power: 100 };
          state.inventory = [];
          state.quests = state.quests.filter(q => !q.active);
          addComms('AI Director', 'You have been reborn. A new life awaits.');
          saveGame();
          showScreen('bridge');
        });
        resolve(s);
      } catch(e) { resolve(null); }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// Toast notification
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(212,168,86,0.9);color:#000;padding:8px 20px;border-radius:4px;font-size:0.85rem;z-index:9999;pointer-events:none;animation:fadeIn 0.3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; setTimeout(() => t.remove(), 500); }, 2000);
}

function loadFromServerData(data) {
  if (data.player) Object.assign(state.player, data.player);
  if (data.ship) Object.assign(state.ship, data.ship);
  if (data.location) Object.assign(state.location, data.location);
  if (data.factionRep) Object.assign(state.factionRep, data.factionRep);
  if (data.combat) { state.combat.score = data.combat.score || 0; state.combat.kills = data.combat.kills || 0; state.combat.cycle = data.combat.cycle || 1; }
  if (data.inventory) state.inventory = data.inventory;
  if (data.quests) state.quests = data.quests;
  if (data.upgrades) Object.assign(state.upgrades, data.upgrades);
  if (data.settings) Object.assign(state.settings, data.settings);
  applyUpgrades();
}

function updateServerStatus(online) {
  const el = document.getElementById('server-status');
  if (online) {
    el.textContent = '\u25CF Server online';
    el.style.color = '#4caf50';
  } else {
    el.textContent = '\u25CB Offline mode';
    el.style.color = '#c0392b';
  }
}

// ================================================================
//  SCREEN MANAGEMENT
// ================================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) { el.classList.add('active'); el.classList.add('fade-in'); }

  state.screen = name;
  const navBar = document.getElementById('nav-bar');
  const showNav = ['bridge','starmap','station','character','rebirth','settings','market'].includes(name);
  navBar.classList.toggle('visible', showNav);

  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  // HUD for gunner
  document.getElementById('hud-canvas').classList.toggle('active', name === 'gunner');

  // Cursor
  document.body.style.cursor = name === 'gunner' ? 'none' : 'default';

  if (name === 'bridge') updateBridgeUI();
  if (name === 'starmap') { resizeStarMap(); renderStarMap(); }
  if (name === 'station') renderStation();
  if (name === 'character') renderCharSheet();
  if (name === 'rebirth') updateRebirthScreen();
  if (name === 'settings') initSettingsScreen();
  if (name === 'market') { if (state.market.orders.length === 0) generateNPCMarketOrders(); renderMarketScreen(); }
  if (name === 'gunner') { if (threeReady) enterGunnerMode(); else addComms('System', '3D engine not available.'); }
}

// ================================================================
//  TITLE SCREEN â€” animated stars
// ================================================================
(function initTitleStars() {
  const container = document.getElementById('title-stars');
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'title-star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = (Math.random() * 5) + 's';
    star.style.animationDuration = (2 + Math.random() * 4) + 's';
    star.style.width = star.style.height = (1 + Math.random() * 2) + 'px';
    container.appendChild(star);
  }
})();

// Server health check
fetch('/health').then(r => r.json()).then(d => {
  updateServerStatus(true);
  document.getElementById('btn-continue').disabled = !localStorage.getItem('oe-save');
}).catch(() => updateServerStatus(false));

// ================================================================
//  CHARACTER CREATION
// ================================================================
let createGenome = null;

function initCreateScreen() {
  const grid = document.getElementById('faction-grid');
  grid.innerHTML = '';
  FACTIONS.forEach(f => {
    const card = document.createElement('div');
    card.className = 'faction-card';
    card.style.borderTopColor = f.color;
    card.innerHTML = `<div class="fname" style="color:${f.color}">${f.name}</div>
      <div class="fdetail">${f.ideology} &mdash; ${f.home}</div>
      <div class="fdetail" style="margin-top:4px;">${f.desc}</div>`;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.player.faction = f.id;
    });
    grid.appendChild(card);
  });
  randomizeGenome();
}

function randomizeGenome() {
  createGenome = new Uint8Array(256);
  crypto.getRandomValues(createGenome);
  drawGenome(createGenome, document.getElementById('genome-canvas'), 256);
  renderGeneStats(createGenome, document.getElementById('gene-stats'));
}

function drawGenome(genome, canvas, size) {
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  const cellSize = size / 16;
  const clusterColors = [
    [255, 80, 80],   // Physical 0-31
    [68, 170, 255],  // Aptitude 32-63
    [180, 100, 255], // Personality 64-95
    [0, 255, 136],   // Resistance 96-127
    [212, 168, 86],  // Appearance 128-159
    [100, 110, 130], // Reserved 160-255
  ];
  for (let i = 0; i < 256; i++) {
    const x = (i % 16) * cellSize;
    const y = Math.floor(i / 16) * cellSize;
    let ci = 5;
    if (i < 32) ci = 0;
    else if (i < 64) ci = 1;
    else if (i < 96) ci = 2;
    else if (i < 128) ci = 3;
    else if (i < 160) ci = 4;
    const [r, g, b] = clusterColors[ci];
    const v = genome[i] / 255;
    const brightness = 0.15 + v * 0.85;
    ctx.fillStyle = `rgba(${Math.round(r*brightness)},${Math.round(g*brightness)},${Math.round(b*brightness)},1)`;
    ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
  }
}

function renderGeneStats(genome, container) {
  const clusters = [
    { name: 'Physical', start: 0, end: 32, color: '#ff5050' },
    { name: 'Aptitude', start: 32, end: 64, color: '#44aaff' },
    { name: 'Personality', start: 64, end: 96, color: '#b464ff' },
    { name: 'Resistance', start: 96, end: 128, color: '#00ff88' },
    { name: 'Appearance', start: 128, end: 160, color: '#d4a856' },
  ];
  container.innerHTML = '';
  clusters.forEach(c => {
    let sum = 0;
    for (let i = c.start; i < c.end; i++) sum += genome[i];
    const avg = sum / (c.end - c.start);
    const pct = (avg / 255 * 100).toFixed(0);
    container.innerHTML += `
      <div class="gene-bar">
        <div class="gene-bar-label"><span>${c.name}</span><span>${pct}%</span></div>
        <div class="gene-bar-track"><div class="gene-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
      </div>`;
  });
}

function createCharacter() {
  const name = document.getElementById('pilot-name').value.trim();
  if (!name) { document.getElementById('pilot-name').style.borderColor = 'var(--danger)'; return; }
  if (!state.player.faction) return;

  state.player.name = name;
  state.player.genome = Array.from(createGenome);
  state.player.age = 20 + Math.floor(Math.random() * 15);

  // Emit to server for authoritative character creation
  if (state.socket) {
    state.socket.emit('player:create', { name, faction: state.player.faction });
  }

  // Set home system based on faction
  const factionObj = FACTIONS.find(f => f.id === state.player.faction);
  if (factionObj) {
    state.factionRep[factionObj.id] = 100;
    addComms('AI Director', `Welcome to ${factionObj.home}, pilot ${name}.`);
    addComms(factionObj.name, `The ${factionObj.name} acknowledges your service.`);
  }

  // Request quests from server
  if (state.socket) state.socket.emit('quests:request');
  else generateQuests();

  saveGame();
  showScreen('bridge');
}

// ================================================================
//  COMMS & QUESTS
// ================================================================
function addComms(sender, msg) {
  state.commsLog.unshift({ sender, msg, time: Date.now() });
  if (state.commsLog.length > 20) state.commsLog.pop();
}

function formatTimeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return sec + 's ago';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  return Math.floor(min / 60) + 'h ago';
}

function generateQuests() {
  const objectives = ['Retrieve','Protect','Eliminate','Escort','Investigate','Sabotage','Explore','Deliver'];
  const resources = ['Titanite Ore','Dark Matter Crystals','Hydrogen Fuel','Rare Earth Compounds','Bio-organic Materials','Ancient Artefacts','Quantum Processors'];
  const hazards = ['Radiation Belt','Asteroid Field','Pirate Territory','Temporal Anomaly','Electromagnetic Storm'];
  for (let i = 0; i < 5; i++) {
    const obj = objectives[Math.floor(Math.random()*objectives.length)];
    const res = resources[Math.floor(Math.random()*resources.length)];
    const haz = hazards[Math.floor(Math.random()*hazards.length)];
    const fac = FACTIONS[Math.floor(Math.random()*FACTIONS.length)];
    const reward = 100 + Math.floor(Math.random()*900);
    state.quests.push({
      id: 'q-' + i,
      title: `${obj} ${res}`,
      summary: `${obj} ${res} in a sector threatened by ${haz}. Contact: ${fac.name}`,
      reward: reward,
      faction: fac.id,
      active: i < 2,
    });
  }
}

// ================================================================
//  BRIDGE UI
// ================================================================
function updateBridgeUI() {
  document.getElementById('bar-hull').style.width = (state.ship.hull / state.ship.maxHull * 100) + '%';
  document.getElementById('bar-shield').style.width = (state.ship.shield / state.ship.maxShield * 100) + '%';
  document.getElementById('bar-fuel').style.width = (state.ship.fuel / state.ship.maxFuel * 100) + '%';
  document.getElementById('bar-power').style.width = state.ship.power + '%';
  document.getElementById('bridge-credits').textContent = state.player.credits.toLocaleString() + ' EC';
  document.getElementById('bridge-sm').textContent = state.player.stellarMarks + ' SM';

  const sys = state.starSystems[state.location.systemIndex];
  document.getElementById('bridge-location').textContent = sys ? sys.name : 'Unknown Sector';
  document.getElementById('bridge-conn').textContent = state.connected ? '\u25CF Online' : '\u25CB Offline';
  document.getElementById('bridge-conn').style.color = state.connected ? 'var(--green)' : 'var(--warn)';

  // Inventory on bridge
  const invEl = document.getElementById('bridge-inventory');
  if (invEl) {
    invEl.innerHTML = state.inventory.length
      ? state.inventory.map(item => `<div style="font-size:0.75rem;color:var(--muted);padding:2px 0;border-bottom:1px solid #111">${item.name} <span style="float:right">x${item.quantity||1}</span></div>`).join('')
      : '<div style="font-size:0.75rem;color:var(--muted)">Empty hold</div>';
  }

  // Comms
  const feed = document.getElementById('comms-feed');
  feed.innerHTML = '';
  state.commsLog.slice(0, 8).forEach(m => {
    const ago = formatTimeAgo(m.time);
    feed.innerHTML += `<div class="comms-msg"><div class="sender">${m.sender} <span style="color:#334;font-weight:normal;font-size:0.65rem">${ago}</span></div>${m.msg}</div>`;
  });

  // Quest tracker with progress
  const qt = document.getElementById('quest-tracker');
  qt.innerHTML = '';
  state.quests.filter(q => q.active && !q.completed).forEach(q => {
    let progressHtml = '';
    if (q.objectives) {
      progressHtml = q.objectives.map(o => {
        const pct = Math.min(100, (o.current || 0) / o.required * 100);
        return `<div style="margin-top:4px;font-size:0.7rem;color:var(--muted)">${o.type}: ${o.target === '*' ? 'any' : o.target} <span style="color:${pct >= 100 ? 'var(--green)' : 'var(--warn)'};">${o.current || 0}/${o.required}</span>
          <div style="height:3px;background:#111;border-radius:2px;margin-top:2px;"><div style="height:100%;width:${pct}%;background:${pct >= 100 ? 'var(--green)' : 'var(--blue)'};border-radius:2px;"></div></div></div>`;
      }).join('');
    }
    qt.innerHTML += `<div class="quest-item"><div class="qt">${q.title || q.name || 'Mission'}</div>${q.summary || ''}${progressHtml}<br/><span style="color:var(--gold)">${q.reward || 0} EC</span></div>`;
  });
}

// ================================================================
//  STAR MAP
// ================================================================
function generateStarSystems() {
  const systems = [];
  for (let i = 0; i < 40; i++) {
    const angle = i * 2.399;
    const radius = 60 + Math.sqrt(i) * 55;
    const jx = (Math.sin(i * 7.3) * 30);
    const jy = (Math.cos(i * 11.1) * 30);
    const x = Math.cos(angle) * radius + jx;
    const y = Math.sin(angle) * radius + jy;
    const factionIdx = Math.floor(i / 5) % 8;
    const faction = FACTIONS[factionIdx];
    const starTypes = ['M-class Red Dwarf','K-class Orange Dwarf','G-class Yellow Dwarf','F-class Yellow-White','A-class White','Neutron Star','Binary System'];
    const resources = ['Titanite Ore','Dark Matter Crystals','Hydrogen Fuel','Rare Earth Compounds','Ancient Artefacts','Quantum Processors'];
    const hazards = ['Radiation Belt','Asteroid Field','Pirate Territory','Temporal Anomaly'];
    const prefixes = ['Alpha','Beta','Gamma','Delta','Zeta','Tau','Sigma','Nova','Kappa','Omega'];
    const suffixes = ['Prime','Reach','Deep','Secundus','Minor','Expanse','Crossing','Haven','Nexus','Gate'];
    const name = prefixes[i % prefixes.length] + ' ' + suffixes[Math.floor(i / prefixes.length) % suffixes.length];
    systems.push({
      id: 'sys-' + i, name, x, y,
      starType: starTypes[i % starTypes.length],
      controllingFaction: faction.id,
      factionColor: faction.color,
      resources: [resources[i % resources.length], resources[(i+3) % resources.length]],
      hazards: i % 4 === 0 ? [hazards[i % hazards.length]] : [],
      planetCount: 1 + (i % 7),
      hasStation: i % 3 === 0,
    });
  }
  // Build jump routes â€” connect nearby systems
  systems.forEach((s, i) => {
    s.connections = [];
    systems.forEach((t, j) => {
      if (i === j) return;
      const dist = Math.hypot(s.x - t.x, s.y - t.y);
      if (dist < 120) s.connections.push(j);
    });
  });
  return systems;
}

let smCanvas, smCtx;
function resizeStarMap() {
  smCanvas = document.getElementById('starmap-canvas');
  smCtx = smCanvas.getContext('2d');
  smCanvas.width = smCanvas.clientWidth;
  smCanvas.height = smCanvas.clientHeight;
}

function renderStarMap() {
  if (!smCtx) return;
  const W = smCanvas.width, H = smCanvas.height;
  smCtx.clearRect(0, 0, W, H);
  smCtx.fillStyle = '#050510';
  smCtx.fillRect(0, 0, W, H);

  // Background grid
  smCtx.strokeStyle = '#0a0f18';
  smCtx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { smCtx.beginPath(); smCtx.moveTo(x, 0); smCtx.lineTo(x, H); smCtx.stroke(); }
  for (let y = 0; y < H; y += 40) { smCtx.beginPath(); smCtx.moveTo(0, y); smCtx.lineTo(W, y); smCtx.stroke(); }

  const cx = W / 2, cy = H / 2;
  const scale = Math.min(W, H) / 700;

  // Draw jump routes
  smCtx.lineWidth = 0.5;
  state.starSystems.forEach((s) => {
    const sx = cx + s.x * scale, sy = cy + s.y * scale;
    (s.connections || []).forEach(ci => {
      const t = state.starSystems[ci];
      const tx = cx + t.x * scale, ty = cy + t.y * scale;
      smCtx.strokeStyle = 'rgba(68,170,255,0.12)';
      smCtx.beginPath(); smCtx.moveTo(sx, sy); smCtx.lineTo(tx, ty); smCtx.stroke();
    });
  });

  // Draw systems
  state.starSystems.forEach((s, i) => {
    const sx = cx + s.x * scale, sy = cy + s.y * scale;
    const isCurrent = i === state.location.systemIndex;
    const isSelected = state.selectedSystem === i;
    const r = isCurrent ? 6 : (isSelected ? 5 : 3.5);

    // Glow
    if (isCurrent || isSelected) {
      const grad = smCtx.createRadialGradient(sx, sy, 0, sx, sy, 20);
      grad.addColorStop(0, isCurrent ? 'rgba(212,168,86,0.3)' : 'rgba(68,170,255,0.2)');
      grad.addColorStop(1, 'transparent');
      smCtx.fillStyle = grad;
      smCtx.beginPath(); smCtx.arc(sx, sy, 20, 0, Math.PI * 2); smCtx.fill();
    }

    smCtx.fillStyle = s.factionColor || '#888';
    smCtx.beginPath(); smCtx.arc(sx, sy, r, 0, Math.PI * 2); smCtx.fill();

    // Station indicator
    if (s.hasStation) {
      smCtx.strokeStyle = 'rgba(255,255,255,0.3)';
      smCtx.lineWidth = 0.8;
      smCtx.beginPath(); smCtx.arc(sx, sy, r + 3, 0, Math.PI * 2); smCtx.stroke();
    }

    // Label
    if (isCurrent || isSelected || scale > 0.8) {
      smCtx.fillStyle = isCurrent ? '#d4a856' : 'rgba(200,214,229,0.6)';
      smCtx.font = `${isCurrent ? 11 : 9}px "Segoe UI"`;
      smCtx.fillText(s.name, sx + r + 4, sy + 3);
    }

    // Current system ring pulse
    if (isCurrent) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
      smCtx.strokeStyle = `rgba(212,168,86,${0.3 + pulse * 0.4})`;
      smCtx.lineWidth = 1.5;
      smCtx.beginPath(); smCtx.arc(sx, sy, 10 + pulse * 4, 0, Math.PI * 2); smCtx.stroke();
    }
  });

  // Legend
  renderMapLegend();
}

function renderMapLegend() {
  const el = document.getElementById('map-legend');
  el.innerHTML = FACTIONS.map(f =>
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:0.75rem;">
      <div style="width:10px;height:10px;border-radius:50%;background:${f.color}"></div>
      <span style="color:var(--muted)">${f.name}</span>
    </div>`
  ).join('');
}

function onStarMapClick(e) {
  if (!smCanvas) return;
  const rect = smCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const cx = smCanvas.width / 2, cy = smCanvas.height / 2;
  const scale = Math.min(smCanvas.width, smCanvas.height) / 700;

  let closest = -1, closestDist = Infinity;
  state.starSystems.forEach((s, i) => {
    const sx = cx + s.x * scale, sy = cy + s.y * scale;
    const d = Math.hypot(mx - sx, my - sy);
    if (d < 15 && d < closestDist) { closest = i; closestDist = d; }
  });

  if (closest >= 0) {
    state.selectedSystem = closest;
    renderSystemDetail(closest);
    document.getElementById('btn-jump').style.display = closest !== state.location.systemIndex ? 'block' : 'none';
    renderStarMap();
  }
}

function onStarMapDblClick(e) {
  onStarMapClick(e);
  if (state.selectedSystem !== null && state.selectedSystem !== state.location.systemIndex) {
    jumpToSystem(state.selectedSystem);
  }
}

function renderSystemDetail(idx) {
  const s = state.starSystems[idx];
  if (!s) return;
  const faction = FACTIONS.find(f => f.id === s.controllingFaction) || { name: 'Unclaimed', color: '#888' };
  const isCurrent = idx === state.location.systemIndex;
  document.getElementById('system-detail').innerHTML = `
    <div class="system-info">
      <h3>${s.name} ${isCurrent ? '<span style="color:var(--gold);font-size:0.75rem">(Current)</span>' : ''}</h3>
      <p>Star: ${s.starType}</p>
      <p>Planets: ${s.planetCount}</p>
      <p>Faction: <span style="color:${faction.color}">${faction.name}</span></p>
      <p>Station: ${s.hasStation ? '<span style="color:var(--green)">Available</span>' : '<span style="color:var(--muted)">None</span>'}</p>
      <p style="margin-top:6px;">Resources:</p>
      <div>${(s.resources||[]).map(r => `<span class="tag">${r}</span>`).join('')}</div>
      ${s.hazards && s.hazards.length ? `<p style="margin-top:6px;">Hazards:</p><div>${s.hazards.map(h => `<span class="tag" style="color:var(--warn);border-color:rgba(255,170,0,0.2);background:rgba(255,170,0,0.06)">${h}</span>`).join('')}</div>` : ''}
    </div>`;
}

function jumpToSystem(idx) {
  AudioSFX.play('jump');
  // Warp flash animation
  const warpOverlay = document.createElement('div');
  warpOverlay.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;background:radial-gradient(ellipse at center,rgba(68,170,255,0.8) 0%,rgba(0,0,0,0) 70%);animation:warpFlash 1.2s ease-out forwards;';
  const style = document.createElement('style');
  style.textContent = '@keyframes warpFlash{0%{opacity:0;transform:scale(0.3)}15%{opacity:1;transform:scale(1)}40%{opacity:1}100%{opacity:0;transform:scale(2)}}';
  document.head.appendChild(style);
  document.body.appendChild(warpOverlay);
  // Star streaks
  const streakCanvas = document.createElement('canvas');
  streakCanvas.style.cssText = 'position:fixed;inset:0;z-index:9997;pointer-events:none;';
  streakCanvas.width = window.innerWidth; streakCanvas.height = window.innerHeight;
  document.body.appendChild(streakCanvas);
  const sctx = streakCanvas.getContext('2d');
  const streaks = Array.from({length: 60}, () => ({
    x: Math.random() * streakCanvas.width,
    y: Math.random() * streakCanvas.height,
    len: 30 + Math.random() * 80,
    speed: 800 + Math.random() * 1200,
    alpha: 0.3 + Math.random() * 0.7,
  }));
  let warpStart = performance.now();
  function drawStreaks() {
    const elapsed = performance.now() - warpStart;
    if (elapsed > 1200) { warpOverlay.remove(); streakCanvas.remove(); style.remove(); return; }
    sctx.clearRect(0, 0, streakCanvas.width, streakCanvas.height);
    const progress = elapsed / 1200;
    const cx = streakCanvas.width / 2, cy = streakCanvas.height / 2;
    streaks.forEach(s => {
      const dx = s.x - cx, dy = s.y - cy;
      const angle = Math.atan2(dy, dx);
      const curLen = s.len * (0.5 + progress * 2);
      const ex = s.x + Math.cos(angle) * curLen * progress;
      const ey = s.y + Math.sin(angle) * curLen * progress;
      sctx.strokeStyle = `rgba(180,210,255,${s.alpha * (1 - progress)})`;
      sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(s.x, s.y); sctx.lineTo(ex, ey); sctx.stroke();
    });
    requestAnimationFrame(drawStreaks);
  }
  drawStreaks();

  state.location.systemIndex = idx;
  state.location.docked = false;
  state.ship.fuel = Math.max(0, state.ship.fuel - 5);
  state.selectedSystem = null;
  const sys = state.starSystems[idx];
  // Report visit to server for quest progress
  if (state.socket) state.socket.emit('system:visit', { systemId: sys.id });
  addComms('Navigation', `Jumped to ${sys.name}. ${sys.hasStation ? 'Station detected â€” docking available.' : 'No stations in range.'}`);
  if (sys.hazards && sys.hazards.length) {
    addComms('Warning', `Hazard detected: ${sys.hazards.join(', ')}`);
  }
  document.getElementById('btn-jump').style.display = 'none';
  renderStarMap();
  saveGame();
}

// ================================================================
//  STATION
// ================================================================
const COMMODITIES = [
  { name: 'Titanite Ore', buy: 120, sell: 95 },
  { name: 'Hydrogen Fuel', buy: 45, sell: 35 },
  { name: 'Dark Matter Crystals', buy: 850, sell: 680 },
  { name: 'Bio-organic Materials', buy: 200, sell: 160 },
  { name: 'Quantum Processors', buy: 1200, sell: 950 },
  { name: 'Anti-matter Reserves', buy: 2000, sell: 1600 },
];

// Mirror of server starter quests (for UI)
const STARTER_QUESTS_CLIENT = [
  { id: 'q-kill-scouts',  name: 'Thin the Ranks',   objectives: [{ type: 'kill', target: 'scout', required: 5 }],  rewards: { credits: 250 } },
  { id: 'q-kill-fighters', name: 'Dogfight Ace',     objectives: [{ type: 'kill', target: 'fighter', required: 3 }], rewards: { credits: 400 } },
  { id: 'q-kill-bombers', name: 'Bomber Buster',     objectives: [{ type: 'kill', target: 'bomber', required: 2 }],  rewards: { credits: 500 } },
  { id: 'q-kill-any-10',  name: 'Combat Veteran',    objectives: [{ type: 'kill', target: '*', required: 10 }],      rewards: { credits: 600 } },
  { id: 'q-visit-3',      name: 'Star Cartographer', objectives: [{ type: 'visit', target: '*', required: 3 }],      rewards: { credits: 300 } },
  { id: 'q-trade-5',      name: 'Merchant Initiate', objectives: [{ type: 'collect', target: '*', required: 5 }],    rewards: { credits: 350 } },
];

function renderStation() {
  const sys = state.starSystems[state.location.systemIndex];
  document.getElementById('station-name').innerHTML = `&#9968; ${sys ? sys.name : 'Unknown'} Station`;

  // Request dynamic prices from server
  if (state.socket) state.socket.emit('station:enter', { systemIndex: state.location.systemIndex });

  const prices = state.stationPrices || COMMODITIES;
  const market = document.getElementById('trade-market');
  market.innerHTML = prices.map(c => `
    <div class="trade-row">
      <span>${c.name}</span>
      <span>
        <button class="trade-buy" onclick="window._buy('${c.name}',${c.buy})">Buy ${c.buy} EC</button>
        <button class="trade-sell" onclick="window._sell('${c.name}',${c.sell})">Sell ${c.sell} EC</button>
      </span>
    </div>`).join('');

  // Inventory display
  const invHtml = state.inventory.length
    ? state.inventory.map(item => `<div class="trade-row"><span>${item.name}</span><span style="color:var(--muted)">x${item.quantity || 1}</span></div>`).join('')
    : '<p style="color:var(--muted);font-size:0.8rem">Empty cargo hold.</p>';

  // Available server quests
  const availableQuests = STARTER_QUESTS_CLIENT.filter(q => !state.quests.find(sq => sq.id === q.id && (sq.active || sq.completed)));

  const missions = document.getElementById('mission-board');
  missions.innerHTML = availableQuests.slice(0, 4).map(q => `
    <div class="quest-item">
      <div class="qt">${q.name}</div>
      ${q.objectives.map(o => `<span style="color:var(--muted);font-size:0.7rem">${o.type}: ${o.target === '*' ? 'any' : o.target} (${o.required})</span>`).join('<br/>')}
      <br/><span style="color:var(--gold)">${q.rewards?.credits || 0} EC</span>
      <button class="btn btn-sm" style="margin-left:8px;padding:3px 10px;font-size:0.7rem" onclick="window._acceptQuest('${q.id}')">Accept</button>
    </div>`).join('') || '<p style="color:var(--muted);font-size:0.8rem">No missions available.</p>';

  // Add inventory section after mission board
  // Available upgrades at station
  const upgradesHtml = SHIP_UPGRADES.filter(u => {
    // Only show if not already purchased (check if stat already at upgrade value)
    return state.upgrades[u.stat] < u.value;
  }).map(u => `
    <div class="trade-row">
      <span>${u.name} <span style="color:var(--muted);font-size:0.7rem">${u.desc}</span></span>
      <button class="trade-buy" onclick="window._buyUpgrade('${u.id}')">${u.cost} EC</button>
    </div>`).join('') || '<p style="color:var(--muted);font-size:0.8rem">All upgrades purchased!</p>';

  const stationGrid = document.querySelector('.station-grid');
  let invPanel = document.getElementById('inv-panel');
  if (!invPanel) {
    invPanel = document.createElement('div');
    invPanel.id = 'inv-panel';
    invPanel.className = 'station-panel';
    stationGrid.appendChild(invPanel);
  }
  invPanel.innerHTML = `<div class="panel-title">Cargo Hold</div>${invHtml}`;

  // Wallet display
  let walletPanel = document.getElementById('wallet-panel');
  if (!walletPanel) {
    walletPanel = document.createElement('div');
    walletPanel.id = 'wallet-panel';
    walletPanel.className = 'station-panel';
    stationGrid.appendChild(walletPanel);
  }
  walletPanel.innerHTML = `<div class="panel-title">Wallet</div>
    <div style="font-size:1.1rem;color:var(--gold);font-weight:600">${state.player.credits.toLocaleString()} EC</div>
    <div style="font-size:0.8rem;color:var(--muted)">${state.player.stellarMarks} SM</div>`;

  // Ship upgrades panel
  let upgradePanel = document.getElementById('upgrade-panel');
  if (!upgradePanel) {
    upgradePanel = document.createElement('div');
    upgradePanel.id = 'upgrade-panel';
    upgradePanel.className = 'station-panel';
    stationGrid.appendChild(upgradePanel);
  }
  upgradePanel.innerHTML = `<div class="panel-title">Ship Upgrades</div>${upgradesHtml}`;

  state.location.docked = true;
}

window._buy = (name, price) => {
  if (state.socket) {
    state.socket.emit('station:buy', { name, price });
  } else if (state.player.credits >= price) {
    state.player.credits -= price;
    state.inventory.push({ name, quantity: 1 });
    addComms('Station', `Purchased ${name} for ${price} EC.`);
    renderStation();
  }
};
window._sell = (name, price) => {
  const idx = state.inventory.findIndex(i => i.name === name);
  if (idx < 0) return;
  if (state.socket) {
    state.inventory.splice(idx, 1);
    state.socket.emit('station:sell', { name, price });
  } else {
    state.inventory.splice(idx, 1);
    state.player.credits += price;
    addComms('Station', `Sold ${name} for ${price} EC.`);
    renderStation();
  }
};
window._acceptQuest = (id) => {
  if (state.socket) {
    state.socket.emit('quest:accept', { questId: id });
  } else {
    const q = state.quests.find(q => q.id === id);
    if (q) { q.active = true; addComms('Mission Board', `Accepted: ${q.title || q.name}`); renderStation(); }
  }
};

window._buyUpgrade = (id) => {
  const u = SHIP_UPGRADES.find(u => u.id === id);
  if (!u) return;
  if (state.player.credits < u.cost) { addComms('Station', 'Insufficient credits.'); return; }
  if (state.upgrades[u.stat] >= u.value) { addComms('Station', 'Already purchased.'); return; }
  state.player.credits -= u.cost;
  state.upgrades[u.stat] = u.value;
  applyUpgrades();
  addComms('Station', `Installed ${u.name}!`);
  AudioSFX.play('quest_complete');
  renderStation();
};

// ================================================================
//  CHARACTER SHEET
// ================================================================
function renderCharSheet() {
  document.getElementById('char-name').textContent = state.player.name || 'Unknown Pilot';

  if (state.player.genome) {
    drawGenome(new Uint8Array(state.player.genome), document.getElementById('char-genome-canvas'), 192);
    renderGeneStats(new Uint8Array(state.player.genome), document.getElementById('char-gene-stats'));
  }

  // Faction standings
  const fs = document.getElementById('faction-standings');
  fs.innerHTML = FACTIONS.map(f => {
    const rep = state.factionRep[f.id] || 0;
    const pct = ((rep + 1000) / 2000 * 100).toFixed(0);
    const rank = rep >= 900 ? 'Exalted' : rep >= 700 ? 'Revered' : rep >= 500 ? 'Honoured' :
      rep >= 300 ? 'Friendly' : rep >= 100 ? 'Accepted' : rep >= 0 ? 'Neutral' :
      rep >= -200 ? 'Distrusted' : rep >= -500 ? 'Unfriendly' : 'Hostile';
    return `<div class="rep-row">
      <span style="color:${f.color};min-width:50px;">${f.name.split(' ')[0]}</span>
      <span style="font-size:0.7rem;color:var(--muted);min-width:60px;text-align:center">${rank}</span>
      <div class="rep-bar"><div class="rep-fill" style="width:${pct}%;background:${f.color}"></div></div>
    </div>`;
  }).join('');

  // Skills from genome
  const skills = document.getElementById('skill-list');
  if (state.player.genome) {
    const g = state.player.genome;
    const aptitudes = [
      { name: 'Combat', gene: 32 }, { name: 'Piloting', gene: 33 },
      { name: 'Engineering', gene: 34 }, { name: 'Trade', gene: 35 },
      { name: 'Science', gene: 36 }, { name: 'Leadership', gene: 37 },
      { name: 'Stealth', gene: 38 }, { name: 'Medicine', gene: 39 },
    ];
    skills.innerHTML = aptitudes.map(a => {
      const val = g[a.gene];
      const pct = (val / 255 * 100).toFixed(0);
      return `<div class="stat-row" style="font-size:0.78rem;">
        ${a.name} <div class="stat-bar"><div class="stat-fill" style="width:${pct}%;background:var(--blue)"></div></div>
        <span style="min-width:30px;text-align:right;color:var(--muted);font-size:0.7rem">${pct}%</span>
      </div>`;
    }).join('');
  }

  // Character info
  const faction = FACTIONS.find(f => f.id === state.player.faction);
  document.getElementById('char-info').innerHTML = `
    <div class="stat-row" style="font-size:0.8rem;">Name <span style="color:var(--gold)">${state.player.name}</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Faction <span style="color:${faction?.color || '#888'}">${faction?.name || 'None'}</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Age <span style="color:var(--muted)">${state.player.age} years</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Rebirths <span style="color:var(--muted)">${state.player.rebirths}</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Credits <span style="color:var(--gold)">${state.player.credits.toLocaleString()} EC</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Kills <span style="color:var(--danger)">${state.combat.kills}</span></div>
    <div class="stat-row" style="font-size:0.8rem;">Score <span style="color:var(--gold)">${state.combat.score.toLocaleString()}</span></div>`;
}

// ================================================================
//  REBIRTH SCREEN
// ================================================================
function updateRebirthScreen() {
  document.getElementById('rb-lives').textContent = state.player.rebirths;
  document.getElementById('rb-shards').textContent = state.combat.kills * 3; // rough shard estimate
  document.getElementById('rb-absorbed').textContent = Math.floor(state.combat.score / 100);
  // Death recap stats
  if (c.deathStats) {
    const ds = c.deathStats;
    let recap = document.getElementById('rb-death-recap');
    if (!recap) {
      recap = document.createElement('div');
      recap.id = 'rb-death-recap';
      recap.style.cssText = 'margin:12px 0;padding:10px;background:rgba(255,40,40,0.08);border:1px solid rgba(255,60,60,0.3);border-radius:6px;text-align:center;';
      const rebirthScreen = document.getElementById('screen-rebirth');
      const btnRow = rebirthScreen.querySelector('.btn-row');
      rebirthScreen.insertBefore(recap, btnRow);
    }
    recap.innerHTML = `<div style="color:#ff6644;font-weight:bold;margin-bottom:8px;">\u2620 KILL RECAP</div>
      <div style="color:#aabbcc;">Kills: <span style="color:#44aaff;font-weight:bold;">${ds.kills}</span> &nbsp;|&nbsp; Score: <span style="color:#d4a856;font-weight:bold;">${ds.score.toLocaleString()}</span></div>
      <div style="color:#aabbcc;">Best streak: <span style="color:#ff8800;font-weight:bold;">x${ds.streak}</span> &nbsp;|&nbsp; Credits: <span style="color:#d4a856;font-weight:bold;">${ds.credits.toLocaleString()} EC</span></div>`;
  }
  // Genetic drift: how much genome has changed from baseline
  if (state.player.genome) {
    const drift = state.player.genome.reduce((sum, g) => sum + Math.abs(g - 128), 0);
    const driftPct = (drift / (256 * 128) * 100).toFixed(1);
    document.getElementById('rb-drift').textContent = driftPct + '%';
  }
  // Ascension progress: based on score
  const ascensionPts = Math.min(1000, Math.floor(state.combat.score / 10));
  document.getElementById('rb-ascension').textContent = `${ascensionPts} / 1000`;
}

// ================================================================
//  SETTINGS SCREEN
// ================================================================
function initSettingsScreen() {
  const volM = document.getElementById('vol-master');
  const volS = document.getElementById('vol-sfx');
  const sens = document.getElementById('setting-sens');
  const scan = document.getElementById('setting-scanlines');
  const shake = document.getElementById('setting-screenshake');
  volM.value = state.settings.masterVol * 100;
  volS.value = state.settings.sfxVol * 100;
  sens.value = state.settings.sensitivity;
  scan.checked = state.settings.scanlines;
  shake.checked = state.settings.screenShake;
  document.getElementById('vol-master-val').textContent = Math.round(state.settings.masterVol * 100) + '%';
  document.getElementById('vol-sfx-val').textContent = Math.round(state.settings.sfxVol * 100) + '%';
  document.getElementById('setting-sens-val').textContent = state.settings.sensitivity;
  volM.oninput = () => { state.settings.masterVol = volM.value / 100; document.getElementById('vol-master-val').textContent = volM.value + '%'; };
  volS.oninput = () => { state.settings.sfxVol = volS.value / 100; document.getElementById('vol-sfx-val').textContent = volS.value + '%'; };
  sens.oninput = () => { state.settings.sensitivity = parseInt(sens.value); document.getElementById('setting-sens-val').textContent = sens.value; };
  scan.onchange = () => { state.settings.scanlines = scan.checked; };
  shake.onchange = () => { state.settings.screenShake = shake.checked; };
}

// ================================================================
//  SHIP UPGRADES
// ================================================================
const SHIP_UPGRADES = [
  { id: 'railgun_mk3',  name: 'Railgun Mk-III',      cost: 800,  stat: 'railgunDmg',  value: 1.5, desc: '+50% railgun damage' },
  { id: 'shield_boost',  name: 'Shield Capacitor',    cost: 600,  stat: 'maxShield',   value: 150, desc: '+50 max shield' },
  { id: 'hull_plating',  name: 'Reinforced Hull',     cost: 500,  stat: 'maxHull',     value: 150, desc: '+50 max hull' },
  { id: 'ammo_expand',   name: 'Expanded Magazine',   cost: 400,  stat: 'maxAmmo',     value: 36,  desc: '+12 max ammo' },
  { id: 'shield_gen',    name: 'Shield Generator II',  cost: 1000, stat: 'shieldRegen', value: 5,   desc: '+2/sec shield regen' },
  { id: 'engine_boost',  name: 'Engine Overcharge',   cost: 700,  stat: 'engineSpeed', value: 1.3, desc: '+30% engine speed' },
];

function applyUpgrades() {
  state.ship.maxHull = state.upgrades.maxHull;
  state.ship.maxShield = state.upgrades.maxShield;
  state.combat.maxAmmo = state.upgrades.maxAmmo;
}

// ================================================================
//  SAVE / LOAD
// ================================================================
function saveGame() {
  const data = {
    player: state.player,
    ship: state.ship,
    location: state.location,
    factionRep: state.factionRep,
    combat: { score: state.combat.score, kills: state.combat.kills, cycle: state.combat.cycle },
    inventory: state.inventory,
    quests: state.quests,
    upgrades: state.upgrades,
    settings: state.settings,
  };
  localStorage.setItem('oe-save', JSON.stringify(data));
  // Also save to server
  if (state.socket) state.socket.emit('game:save', data);
}

function loadGame() {
  try {
    const raw = localStorage.getItem('oe-save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    loadFromServerData(data);
    return true;
  } catch(e) { return false; }
}

// ================================================================
//  THREE.JS â€” 3D VIEWPORT
// ================================================================
const canvas3d = document.getElementById('game-canvas');
const hudCanvas = document.getElementById('hud-canvas');
const hudCtx = hudCanvas.getContext('2d');
const c = state.combat;
let renderer, scene, camera, ship, turretMount, cockpit;
let railGlowMatL, railGlowMatR, muzzleMat, railL, railR;
let threeReady = false;

try {

renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000010, 0.00025);

camera = new THREE.PerspectiveCamera(75, 1, 0.01, 50000);

// Lighting
scene.add(new THREE.AmbientLight(0x112244, 0.7));
const starLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
starLight.position.set(500, 200, 300);
scene.add(starLight);
const fillLight = new THREE.DirectionalLight(0x4466aa, 0.4);
fillLight.position.set(-300, -100, -200);
scene.add(fillLight);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  hudCanvas.width = w;
  hudCanvas.height = h;
}
window.addEventListener('resize', resize);
resize();

// â”€â”€ Starfield â”€â”€â”€â”€
const starCount = 5000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 500 + Math.random() * 9500;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xccbbaa, size: 2, sizeAttenuation: true, transparent: true, opacity: 0.8 })));

// Nebulae
for (let i = 0; i < 4; i++) {
  const nebMat = new THREE.MeshBasicMaterial({
    color: [0x1a0a2e, 0x0a1a2e, 0x2e0a1a, 0x0a2a1a][i],
    transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,
  });
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), nebMat);
  neb.position.set((Math.random()-0.5)*5000, (Math.random()-0.5)*3000, -2000 - i*2000);
  neb.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(neb);
}

// â”€â”€ Ship â”€â”€â”€â”€
ship = new THREE.Group(); ship.name = 'player-ship';
const hullMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6, metalness: 0.4 });
const accentMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.3, metalness: 0.6, emissive: 0x44aaff, emissiveIntensity: 0.3 });
const shipCanopyMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.35 });
const gunMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.4, metalness: 0.7 });

ship.add(new THREE.Mesh(new THREE.BoxGeometry(3,1,10), hullMat));
const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5,4,4), hullMat);
nose.rotation.x = Math.PI/2; nose.position.z = -7; ship.add(nose);
const wingGeo = new THREE.BoxGeometry(8,0.15,4);
const wL = new THREE.Mesh(wingGeo, hullMat); wL.position.set(-4.5,0,1); wL.rotation.z=-0.08; ship.add(wL);
const wR = new THREE.Mesh(wingGeo, hullMat); wR.position.set(4.5,0,1); wR.rotation.z=0.08; ship.add(wR);
const finGeo = new THREE.BoxGeometry(0.15,1.5,2);
{ const fL = new THREE.Mesh(finGeo, accentMat); fL.position.set(-8.4,0.6,1); ship.add(fL); }
{ const fR = new THREE.Mesh(finGeo, accentMat); fR.position.set(8.4,0.6,1); ship.add(fR); }
const tfGeo = new THREE.BoxGeometry(0.15,2,2.5);
const tL = new THREE.Mesh(tfGeo, hullMat); tL.position.set(-1.2,1.2,4.5); tL.rotation.z=0.15; ship.add(tL);
const tR = new THREE.Mesh(tfGeo, hullMat); tR.position.set(1.2,1.2,4.5); tR.rotation.z=-0.15; ship.add(tR);
const eGeo = new THREE.CylinderGeometry(0.5,0.7,2,8);
const eL = new THREE.Mesh(eGeo, accentMat); eL.rotation.x=Math.PI/2; eL.position.set(-1,-0.2,5.5); ship.add(eL);
const eR = new THREE.Mesh(eGeo, accentMat); eR.rotation.x=Math.PI/2; eR.position.set(1,-0.2,5.5); ship.add(eR);
const glowGeo = new THREE.CircleGeometry(0.65,16);
const glowMat = new THREE.MeshBasicMaterial({ color:0x44aaff, transparent:true, opacity:0.7 });
{ const gl1 = new THREE.Mesh(glowGeo, glowMat); gl1.position.set(-1,-0.2,6.51); ship.add(gl1); }
{ const gl2 = new THREE.Mesh(glowGeo, glowMat); gl2.position.set(1,-0.2,6.51); ship.add(gl2); }
{ const canopyM = new THREE.Mesh(new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI/2), shipCanopyMat); canopyM.position.set(0,0.5,-3); ship.add(canopyM); }
{ const gunMount = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,0.4,8), gunMat); gunMount.position.set(0,0.8,-1); ship.add(gunMount); }
const bbGeo = new THREE.CylinderGeometry(0.08,0.08,3,6);
const bL2 = new THREE.Mesh(bbGeo, gunMat); bL2.rotation.x=Math.PI/2; bL2.position.set(-0.25,0.95,-2.5); ship.add(bL2);
const bR2 = new THREE.Mesh(bbGeo, gunMat); bR2.rotation.x=Math.PI/2; bR2.position.set(0.25,0.95,-2.5); ship.add(bR2);
turretMount = new THREE.Object3D(); turretMount.position.set(0, 1.2, -0.5); ship.add(turretMount);
scene.add(ship);

// â”€â”€ Cockpit â”€â”€â”€â”€
cockpit = new THREE.Group(); cockpit.name = 'gunner-cockpit';
const cpCanopyMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.06, side: THREE.FrontSide, depthWrite: false });
const cpCanopy = new THREE.Mesh(new THREE.SphereGeometry(3.0,32,24,0,Math.PI*2,0,Math.PI*0.6), cpCanopyMat);
cpCanopy.position.set(0,0,-2.5); cpCanopy.rotation.x = Math.PI; cockpit.add(cpCanopy);
const frameMat = new THREE.MeshBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 });
for (let i = 0; i < 6; i++) {
  const angle = (i/6)*Math.PI*2;
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,3.5,4), frameMat);
  strut.position.set(Math.sin(angle)*2.8, Math.cos(angle)*2.0, -3.0);
  strut.rotation.x = Math.PI*0.3; strut.rotation.z = angle; cockpit.add(strut);
}
const seatMat = new THREE.MeshBasicMaterial({ color: 0x2a3540, transparent: true, opacity: 0.7 });
{ const sb = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,0.08), seatMat); sb.position.set(0,-0.1,0.4); cockpit.add(sb); }
{ const ss = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.08,0.5), seatMat); ss.position.set(0,-0.5,0.1); cockpit.add(ss); }
{ const aL = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.08,0.4), seatMat); aL.position.set(-0.35,-0.35,0); cockpit.add(aL); }
{ const aR = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.08,0.4), seatMat); aR.position.set(0.35,-0.35,0); cockpit.add(aR); }
{ const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.12,0.3,8), frameMat); sp.position.set(0,-0.75,0.1); cockpit.add(sp); }

// Railgun barrels + glow
const railMat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.8 });
railGlowMatL = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0 });
railGlowMatR = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0 });
railL = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,4,6), railMat);
railL.rotation.x=Math.PI/2; railL.position.set(-0.18,-0.3,-2.0); cockpit.add(railL);
railR = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,4,6), railMat);
railR.rotation.x=Math.PI/2; railR.position.set(0.18,-0.3,-2.0); cockpit.add(railR);
{ const rgL = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4,6), railGlowMatL); rgL.rotation.set(Math.PI/2,0,0); rgL.position.set(-0.18,-0.3,-2.0); cockpit.add(rgL); }
{ const rgR = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4,6), railGlowMatR); rgR.rotation.set(Math.PI/2,0,0); rgR.position.set(0.18,-0.3,-2.0); cockpit.add(rgR); }
muzzleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), muzzleMat);
muzzle.position.set(0,-0.3,-4.2); cockpit.add(muzzle);

// Side panels
const panelMat = new THREE.MeshBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.6 });
const pnlL = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.8,1.2), panelMat);
pnlL.position.set(-1.3,-0.2,-0.5); pnlL.rotation.y = 0.4; cockpit.add(pnlL);
const pnlR = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.8,1.2), panelMat);
pnlR.position.set(1.3,-0.2,-0.5); pnlR.rotation.y = -0.4; cockpit.add(pnlR);
const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.8), new THREE.MeshBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.5 }));
consoleMesh.position.set(0,-0.6,-0.8); consoleMesh.rotation.x = -0.3; cockpit.add(consoleMesh);
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.6), new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.15 }));
screenMesh.position.set(0,-0.55,-0.8); screenMesh.rotation.x = -0.3 + Math.PI; cockpit.add(screenMesh);

camera.add(cockpit);
scene.add(camera);

// â”€â”€ Engine exhaust particles â”€â”€â”€â”€
const exhaustParticles = [];
const exhaustMat = new THREE.PointsMaterial({ color: 0x44aaff, size: 0.3, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
function spawnExhaust() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(30);
  for (let i = 0; i < 30; i += 3) {
    positions[i] = (Math.random() - 0.5) * 1.5;
    positions[i+1] = (Math.random() - 0.5) * 0.5;
    positions[i+2] = 6 + Math.random() * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, exhaustMat.clone());
  points.position.copy(ship.position);
  points.quaternion.copy(ship.quaternion);
  scene.add(points);
  exhaustParticles.push({ mesh: points, age: 0, maxAge: 800 });
}

// ================================================================
//  GUNNER MODE â€” COMBAT
// ================================================================
const SPAWN_RADIUS = 250, SPAWN_INTERVAL = 2200, ENEMY_SPEED = 18, NAIL_SPEED = 400;
const CHARGE_TIME = 600, COOLDOWN_TIME = 400, MOUSE_SENS = 0.002, MAX_PITCH = 1.2, MAX_YAW = 1.5;

function enterGunnerMode() {
  c.active = true;
  c.streak = 0; c.streakTimer = 0; c.streakMultiplier = 1;
  AudioSFX.startAmbience();
  AudioSFX.startBGM();
  canvas3d.requestPointerLock();
  spawnAsteroids();
  if (c.spaceDust.length === 0) spawnSpaceDust();
  // Initialize new systems
  createStargate();
  spawnSystemNPCs();
  spawnStationModel(new THREE.Vector3(120, 10, -200));
  createRailgun3DModel();
  addComms('EDEN AI', 'All systems online. Press T for chatbot, M to mine, G for stargate, K for skins.');
  addComms('System', 'Gunner mode activated â€” Mouse aim, Click fire, R reload, ESC exit');
}

function spawnAsteroids() {
  for (let i = 0; i < 30; i++) {
    const g = new THREE.Group();
    const size = 2 + Math.random() * 6;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    // Deform vertices for rocky look
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      pos.setXYZ(v, pos.getX(v) * (0.7 + Math.random()*0.6), pos.getY(v) * (0.7 + Math.random()*0.6), pos.getZ(v) * (0.7 + Math.random()*0.6));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9, metalness: 0.2, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    g.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 350;
    const h = (Math.random() - 0.5) * 120;
    g.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
    g.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
    g.userData.rotSpeed = new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
    scene.add(g);
    c.asteroids.push(g);
  }
}

function spawnSpaceDust() {
  for (let i = 0; i < 80; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.3 + Math.random() * 0.3 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 4, 4), mat);
    m.position.set((Math.random()-0.5)*500, (Math.random()-0.5)*200, (Math.random()-0.5)*500);
    m.userData.drift = new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*0.5, (Math.random()-0.5)*2);
    scene.add(m);
    c.spaceDust.push(m);
  }
}

function spawnLootDrop(pos, type) {
  const g = new THREE.Group();
  const colors = { credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44 };
  const geo = new THREE.OctahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  g.add(mesh);
  // Glow ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2, 16), new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  g.add(ring);
  g.position.copy(pos);
  g.userData.type = type;
  g.userData.age = 0;
  scene.add(g);
  c.lootDrops.push({ group: g, type, age: 0 });
}

function exitGunnerMode() {
  c.active = false;
  if (document.pointerLockElement) document.exitPointerLock();
  // Clean up all 3D objects
  c.enemyBolts.forEach(b => scene.remove(b.group)); c.enemyBolts = [];
  c.enemies.forEach(e => scene.remove(e.group)); c.enemies = [];
  c.projectiles.forEach(p => scene.remove(p.group)); c.projectiles = [];
  c.explosions.forEach(ex => scene.remove(ex.group)); c.explosions = [];
  c.asteroids.forEach(a => scene.remove(a)); c.asteroids = [];
  c.lootDrops.forEach(l => scene.remove(l.group)); c.lootDrops = [];
  c.spaceDust.forEach(d => scene.remove(d)); c.spaceDust = [];
  c.dmgNumbers = [];
  // Clean up new systems
  if (state.npcShips) { state.npcShips.forEach(n => scene.remove(n.mesh)); state.npcShips = []; }
  if (c.stargate) { scene.remove(c.stargate); c.stargate = null; }
  if (c.stargateParticles) { c.stargateParticles.forEach(p => scene.remove(p)); c.stargateParticles = []; }
  if (c.railgun3D) { scene.remove(c.railgun3D); c.railgun3D = null; }
  if (c.npcStation) { scene.remove(c.npcStation); c.npcStation = null; }
  stopMining();
  state.mining.active = false;
  state.chatbot.visible = false;
  const chatEl = document.getElementById('chatbot-panel'); if (chatEl) chatEl.style.display = 'none';
  const skinEl = document.getElementById('skin-panel'); if (skinEl) skinEl.style.display = 'none';
  AudioSFX.stopBGM();
  showScreen('bridge');
}

function createEnemy(type) {
  const types = {
    scout:       { color: 0xaa4444, scale: 0.6, hp: 2, points: 10, speed: 1.3 },
    fighter:     { color: 0xcc6644, scale: 1.0, hp: 4, points: 25, speed: 1.0 },
    bomber:      { color: 0x886644, scale: 1.5, hp: 8, points: 50, speed: 0.7 },
    interceptor: { color: 0xcc44aa, scale: 0.8, hp: 3, points: 15, speed: 1.6 },
  };
  const cfg = types[type] || types.fighter;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.5, metalness: 0.7, emissive: cfg.color, emissiveIntensity: 0.25 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5*cfg.scale,0.5*cfg.scale,3*cfg.scale), mat));
  const wg = new THREE.BoxGeometry(4*cfg.scale,0.1*cfg.scale,1.5*cfg.scale);
  { const wL = new THREE.Mesh(wg, mat); wL.position.set(-2*cfg.scale,0,0); g.add(wL); }
  { const wR = new THREE.Mesh(wg, mat); wR.position.set(2*cfg.scale,0,0); g.add(wR); }
  const eg = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.6 });
  { const eM = new THREE.Mesh(new THREE.CircleGeometry(0.3*cfg.scale,8), eg); eM.position.set(0,0,1.6*cfg.scale); g.add(eM); }

  const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
  const r = SPAWN_RADIUS + Math.random()*100;
  g.position.set(ship.position.x + r*Math.sin(phi)*Math.cos(theta), ship.position.y + r*Math.sin(phi)*Math.sin(theta)*0.3, ship.position.z + r*Math.cos(phi));
  g.lookAt(ship.position);
  scene.add(g);
  c.enemies.push({ group: g, hp: cfg.hp, maxHp: cfg.hp, speed: ENEMY_SPEED * cfg.speed, type, points: cfg.points, cfg, hitFlash: 0 });
}

function fireRailgun() {
  if (!c.weaponReady || c.ammo <= 0) return;
  c.weaponReady = false; c.charging = true; c.chargeStart = performance.now();
  AudioSFX.play('charge');
}

function spawnNail() {
  c.ammo--;
  c.heat = Math.min(1, c.heat + 0.12);
  c.recoilVel = -8;
  muzzleMat.opacity = 1;
  AudioSFX.play('fire');
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().add(dir.clone().multiplyScalar(1));
  const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.015,0.5,6), new THREE.MeshBasicMaterial({ color: 0xaabbcc }));
  nail.quaternion.copy(camera.quaternion); nail.rotateX(Math.PI/2); nail.position.copy(origin);
  const trailMat2 = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.6 });
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,2,4), trailMat2);
  trail.quaternion.copy(nail.quaternion); trail.position.copy(origin);
  const g = new THREE.Group(); g.add(nail); g.add(trail); scene.add(g);
  c.projectiles.push({ group: g, dir: dir.clone(), speed: NAIL_SPEED, life: 3000, age: 0, trailMat: trailMat2 });
}

function createBossEnemy() {
  const g = new THREE.Group();
  const bossMat = new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.3, metalness: 0.9, emissive: 0xff4400, emissiveIntensity: 0.5 });
  // Main body
  g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2, 10), bossMat));
  // Wings
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xcc1100, roughness: 0.4, metalness: 0.8, emissive: 0xcc2200, emissiveIntensity: 0.3 });
  { const w1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), wingMat); w1.position.set(-8, 0, 0); g.add(w1); }
  { const w2 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), wingMat); w2.position.set(8, 0, 0); g.add(w2); }
  // Engine glow
  const glowMat2 = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
  { const eg1 = new THREE.Mesh(new THREE.CircleGeometry(1.2, 12), glowMat2); eg1.position.set(-3, 0, 5.5); g.add(eg1); }
  { const eg2 = new THREE.Mesh(new THREE.CircleGeometry(1.2, 12), glowMat2); eg2.position.set(3, 0, 5.5); g.add(eg2); }
  // Turrets
  const turretMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  { const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), turretMat); t1.rotation.x = Math.PI/2; t1.position.set(-5, 1, -2); g.add(t1); }
  { const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), turretMat); t2.rotation.x = Math.PI/2; t2.position.set(5, 1, -2); g.add(t2); }
  const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
  const r = SPAWN_RADIUS + 200;
  g.position.set(ship.position.x + r*Math.sin(phi)*Math.cos(theta), ship.position.y + r*Math.sin(phi)*Math.sin(theta)*0.3, ship.position.z + r*Math.cos(phi));
  g.lookAt(ship.position);
  scene.add(g);
  c.enemies.push({ group: g, hp: 30, maxHp: 30, speed: ENEMY_SPEED * 0.4, type: 'boss', points: 500, cfg: { scale: 3, color: 0xff2200 }, hitFlash: 0, isBoss: true });
}

function spawnExplosion(pos, scale) {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const mat2 = new THREE.MeshBasicMaterial({ color: [0xff4422,0xffaa00,0xff6600,0xffcc44][i%4], transparent: true, opacity: 1 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2+Math.random()*0.3,6,6), mat2);
    m.userData = { dir: new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(), speed: 15+Math.random()*25 };
    g.add(m);
  }
  g.position.copy(pos); g.scale.setScalar(scale||1); scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 600 });
}

// ================================================================
//  HUD RENDERER (Gunner Mode)
// ================================================================
function renderHUD() {
  const W = hudCanvas.width, H = hudCanvas.height;
  const cx = W/2, cy = H/2;
  hudCtx.clearRect(0, 0, W, H);
  if (!c.active) return;

  const primary = '#44aaff', accent = '#00ff88', warning = '#ffaa00', danger = '#ff4444';

  // Crosshair
  hudCtx.strokeStyle = primary; hudCtx.lineWidth = 1.5; hudCtx.globalAlpha = 0.8;
  hudCtx.beginPath(); hudCtx.arc(cx, cy, 30, 0, Math.PI*2); hudCtx.stroke();
  hudCtx.fillStyle = primary; hudCtx.globalAlpha = 0.9;
  hudCtx.beginPath(); hudCtx.arc(cx, cy, 2, 0, Math.PI*2); hudCtx.fill();
  hudCtx.globalAlpha = 0.5;
  [[cx-40,cy,cx-15,cy],[cx+15,cy,cx+40,cy],[cx,cy-40,cx,cy-15],[cx,cy+15,cx,cy+40]].forEach(([x1,y1,x2,y2]) => {
    hudCtx.beginPath(); hudCtx.moveTo(x1,y1); hudCtx.lineTo(x2,y2); hudCtx.stroke();
  });

  // Charge arc
  if (c.charging) {
    hudCtx.strokeStyle = '#ffcc00'; hudCtx.lineWidth = 3; hudCtx.globalAlpha = 0.9;
    hudCtx.beginPath(); hudCtx.arc(cx, cy, 36, -Math.PI/2, -Math.PI/2 + c.chargeLevel*Math.PI*2); hudCtx.stroke();
  }
  hudCtx.globalAlpha = 1;

  // Weapon (bottom-right)
  const wrx = W-220, wry = H-140;
  hudCtx.font = '11px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('WEAPON', wrx, wry);
  hudCtx.font = 'bold 16px "Segoe UI"'; hudCtx.fillStyle = primary; hudCtx.fillText('RAILGUN MK-II', wrx, wry+20);
  hudCtx.font = '11px "Segoe UI"';
  hudCtx.fillStyle = c.ammo > 6 ? accent : c.ammo > 0 ? warning : danger;
  hudCtx.fillText('AMMO  ' + c.ammo + ' / ' + c.maxAmmo, wrx, wry+42);
  hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(wrx, wry+48, 180, 6);
  hudCtx.fillStyle = c.ammo > 6 ? accent : c.ammo > 0 ? warning : danger;
  hudCtx.fillRect(wrx, wry+48, 180*(c.ammo/c.maxAmmo), 6);
  hudCtx.fillStyle = '#445566'; hudCtx.fillText('HEAT', wrx, wry+72);
  hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(wrx+40, wry+64, 140, 6);
  hudCtx.fillStyle = c.heat > 0.7 ? danger : c.heat > 0.4 ? warning : primary;
  hudCtx.fillRect(wrx+40, wry+64, 140*c.heat, 6);
  hudCtx.fillStyle = c.weaponReady ? accent : warning;
  hudCtx.fillText(c.weaponReady ? '\u25CF READY' : c.charging ? '\u25D0 CHARGING' : '\u25CB COOLING', wrx, wry+92);

  // Shield/Hull (top-left)
  const slx = 24, sly = 30;
  hudCtx.font = '11px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('SHIELD', slx, sly);
  hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(slx, sly+6, 180, 8);
  hudCtx.fillStyle = state.ship.shield > 30 ? '#44aaff' : danger;
  hudCtx.fillRect(slx, sly+6, 180*(state.ship.shield/state.ship.maxShield), 8);
  hudCtx.fillStyle = '#445566'; hudCtx.fillText('HULL', slx, sly+32);
  hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(slx, sly+38, 180, 8);
  hudCtx.fillStyle = state.ship.hull > 30 ? '#cc4444' : danger;
  hudCtx.fillRect(slx, sly+38, 180*(state.ship.hull/state.ship.maxHull), 8);
  hudCtx.fillStyle = '#778899';
  hudCtx.fillText(Math.floor(state.ship.shield)+'%', slx+185, sly+14);
  hudCtx.fillText(Math.floor(state.ship.hull)+'%', slx+185, sly+46);

  // Score (top-right)
  const srx = W-200, sry = 30;
  hudCtx.font = '11px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('SCORE', srx, sry);
  hudCtx.font = 'bold 22px "Segoe UI"'; hudCtx.fillStyle = '#d4a856'; hudCtx.fillText(c.score.toLocaleString(), srx, sry+26);
  hudCtx.font = '11px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('KILLS ' + c.kills + '  |  CYCLE ' + c.cycle, srx, sry+44);
  // Kill streak
  if (c.streak >= 3) {
    const streakColor = c.streak >= 10 ? '#ff2200' : c.streak >= 5 ? '#ffcc00' : '#ff8800';
    hudCtx.font = 'bold 14px "Segoe UI"'; hudCtx.fillStyle = streakColor;
    hudCtx.fillText('\u2605 STREAK x' + c.streak + ' (' + c.streakMultiplier + 'x)', srx, sry+62);
  }

  // Credits (bottom-left)
  hudCtx.font = '11px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('CREDITS', 24, H-60);
  hudCtx.font = 'bold 16px "Segoe UI"'; hudCtx.fillStyle = '#d4a856'; hudCtx.fillText(state.player.credits.toLocaleString() + ' EC', 24, H-42);

  // Minimap radar (bottom-center)
  const mapR = 70, mapCx = cx, mapCy = H - mapR - 20;
  hudCtx.globalAlpha = 0.15; hudCtx.fillStyle = '#003366';
  hudCtx.beginPath(); hudCtx.arc(mapCx, mapCy, mapR, 0, Math.PI*2); hudCtx.fill();
  hudCtx.globalAlpha = 0.4; hudCtx.strokeStyle = '#44aaff'; hudCtx.lineWidth = 1;
  hudCtx.beginPath(); hudCtx.arc(mapCx, mapCy, mapR, 0, Math.PI*2); hudCtx.stroke();
  hudCtx.beginPath(); hudCtx.arc(mapCx, mapCy, mapR*0.5, 0, Math.PI*2); hudCtx.stroke();
  // Player dot
  hudCtx.globalAlpha = 0.9; hudCtx.fillStyle = '#00ff88';
  hudCtx.beginPath(); hudCtx.arc(mapCx, mapCy, 3, 0, Math.PI*2); hudCtx.fill();
  // Enemy dots
  c.enemies.forEach(e => {
    const dx = e.group.position.x - ship.position.x;
    const dz = e.group.position.z - ship.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const mapScale = mapR / (SPAWN_RADIUS + 200);
    const mx = mapCx + dx * mapScale;
    const my = mapCy + dz * mapScale;
    if (Math.abs(mx-mapCx) < mapR && Math.abs(my-mapCy) < mapR) {
      hudCtx.fillStyle = e.isBoss ? '#ff2200' : '#ff4444';
      hudCtx.beginPath(); hudCtx.arc(mx, my, e.isBoss ? 4 : 2, 0, Math.PI*2); hudCtx.fill();
    }
  });
  // Incoming bolt dots (orange)
  c.enemyBolts.forEach(b => {
    const dx = b.group.position.x - ship.position.x;
    const dz = b.group.position.z - ship.position.z;
    const mapScale = mapR / (SPAWN_RADIUS + 200);
    const mx = mapCx + dx * mapScale;
    const my = mapCy + dz * mapScale;
    if (Math.abs(mx-mapCx) < mapR && Math.abs(my-mapCy) < mapR) {
      hudCtx.fillStyle = '#ff8800';
      hudCtx.beginPath(); hudCtx.arc(mx, my, 1.5, 0, Math.PI*2); hudCtx.fill();
    }
  });
  hudCtx.globalAlpha = 1;
  hudCtx.font = '9px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('RADAR', mapCx-15, mapCy+mapR+12);

  // Damage flash
  if (c.damageFlash > 0) {
    hudCtx.globalAlpha = (c.damageFlash / 200) * 0.2;
    hudCtx.fillStyle = '#ff0000';
    hudCtx.fillRect(0, 0, W, H);
    hudCtx.globalAlpha = 1;
  }

  // Boss HP bar (top-center)
  const boss = c.enemies.find(e => e.isBoss);
  if (boss) {
    const bw = 300, bh = 12, bx = cx - bw/2, by = 60;
    hudCtx.fillStyle = '#445566'; hudCtx.font = 'bold 13px "Segoe UI"';
    hudCtx.fillText('\u26a0 BOSS', bx, by-6);
    hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(bx, by, bw, bh);
    hudCtx.fillStyle = '#ff2200'; hudCtx.fillRect(bx, by, bw*(boss.hp/boss.maxHp), bh);
    hudCtx.strokeStyle = '#ff4422'; hudCtx.lineWidth = 1; hudCtx.strokeRect(bx, by, bw, bh);
  }

  // Enemy bolt count on HUD
  if (c.enemyBolts.length > 0) {
    hudCtx.font = '10px "Segoe UI"'; hudCtx.fillStyle = '#ff4444';
    hudCtx.fillText('\u26a0 INCOMING: ' + c.enemyBolts.length, 24, H-20);
  }

  // Floating damage numbers
  for (let i = c.dmgNumbers.length - 1; i >= 0; i--) {
    const dn = c.dmgNumbers[i];
    dn.age += 16;
    const screenPos = dn.pos.clone().project(camera);
    const sx = (screenPos.x * 0.5 + 0.5) * W;
    const sy = (-screenPos.y * 0.5 + 0.5) * H - dn.age * 0.05;
    if (screenPos.z < 1) {
      hudCtx.globalAlpha = Math.max(0, 1 - dn.age / 1200);
      hudCtx.font = 'bold 16px "Segoe UI"'; hudCtx.fillStyle = dn.color;
      hudCtx.fillText(dn.text, sx, sy);
    }
    if (dn.age > 1200) c.dmgNumbers.splice(i, 1);
  }
  hudCtx.globalAlpha = 1;

  // Quest tracker (top-left, below shield/hull)
  const activeQuests = state.quests.filter(q => q.active);
  if (activeQuests.length > 0) {
    const qx = 24, qy = 110;
    hudCtx.font = '9px "Segoe UI"'; hudCtx.fillStyle = '#556677';
    hudCtx.fillText('MISSIONS', qx, qy);
    activeQuests.slice(0, 3).forEach((q, qi) => {
      const y = qy + 14 + qi * 16;
      hudCtx.globalAlpha = 0.7; hudCtx.fillStyle = '#88aacc';
      hudCtx.fillText('\u25B8 ' + q.title, qx, y);
      hudCtx.fillStyle = '#d4a856'; hudCtx.fillText(q.reward + ' EC', qx + 140, y);
    });
    hudCtx.globalAlpha = 1;
  }

  // Mining progress bar (left side, below quests)
  if (state.mining && state.mining.active) {
    const mx = 24, my = 200;
    hudCtx.font = '10px "Segoe UI"'; hudCtx.fillStyle = '#ffaa00';
    hudCtx.fillText('\u26CF MINING: ' + (state.mining.targetOre || 'Asteroid'), mx, my);
    hudCtx.fillStyle = '#1a1a2a'; hudCtx.fillRect(mx, my + 4, 160, 8);
    hudCtx.fillStyle = '#ffaa00'; hudCtx.fillRect(mx, my + 4, 160 * state.mining.progress, 8);
    hudCtx.strokeStyle = '#ffaa00'; hudCtx.lineWidth = 0.5; hudCtx.strokeRect(mx, my + 4, 160, 8);
    hudCtx.fillStyle = '#ffcc44'; hudCtx.fillText(Math.floor(state.mining.progress * 100) + '%', mx + 165, my + 11);
  }

  // NPC ships on radar
  if (state.npcShips && state.npcShips.length > 0) {
    const mapScale = mapR / (SPAWN_RADIUS + 200);
    state.npcShips.forEach(n => {
      if (!n.mesh) return;
      const dx = n.mesh.position.x - ship.position.x;
      const dz = n.mesh.position.z - ship.position.z;
      const mx2 = mapCx + dx * mapScale;
      const my2 = mapCy + dz * mapScale;
      if (Math.abs(mx2 - mapCx) < mapR && Math.abs(my2 - mapCy) < mapR) {
        hudCtx.fillStyle = n.hostile ? '#ff6600' : '#00ccff';
        hudCtx.beginPath(); hudCtx.arc(mx2, my2, 2.5, 0, Math.PI * 2); hudCtx.fill();
      }
    });
  }

  // Stargate indicator on radar
  if (c.stargate) {
    const sgDx = c.stargate.position.x - ship.position.x;
    const sgDz = c.stargate.position.z - ship.position.z;
    const mapScale2 = mapR / (SPAWN_RADIUS + 200);
    const sgMx = mapCx + sgDx * mapScale2;
    const sgMy = mapCy + sgDz * mapScale2;
    if (Math.abs(sgMx - mapCx) < mapR && Math.abs(sgMy - mapCy) < mapR) {
      hudCtx.strokeStyle = '#cc44ff'; hudCtx.lineWidth = 1.5;
      hudCtx.beginPath(); hudCtx.arc(sgMx, sgMy, 5, 0, Math.PI * 2); hudCtx.stroke();
      hudCtx.fillStyle = '#cc44ff'; hudCtx.font = '7px "Segoe UI"';
      hudCtx.fillText('SG', sgMx - 5, sgMy - 7);
    }
  }

  // Alt universe status
  if (state.inAltUniverse) {
    hudCtx.font = 'bold 12px "Segoe UI"'; hudCtx.fillStyle = '#cc44ff'; hudCtx.globalAlpha = 0.7 + 0.3 * Math.sin(state.gameTime * 0.003);
    hudCtx.fillText('\u2726 ALT UNIVERSE â€” Artifacts: ' + (state.altUniverse ? state.altUniverse.artifactsCollected : 0), cx - 100, 22);
    hudCtx.globalAlpha = 1;
  }

  // Keybind hints (bottom-right, above weapon)
  hudCtx.font = '9px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.globalAlpha = 0.6;
  const kx = W - 180, ky = H - 160;
  hudCtx.fillText('M:Mine  T:Chat  K:Skins  G:Gate  C:Collect', kx - 40, ky);
  hudCtx.globalAlpha = 1;

  // Scanlines
  if (state.settings.scanlines) {
    hudCtx.globalAlpha = 0.03; hudCtx.fillStyle = '#44aaff';
    for (let sy = 0; sy < H; sy += 4) hudCtx.fillRect(0, sy, W, 1);
    hudCtx.globalAlpha = 1;
  }

  // Corner brackets
  hudCtx.strokeStyle = '#334455'; hudCtx.lineWidth = 1; hudCtx.globalAlpha = 0.4;
  const bl = 40;
  [[10,10+bl,10,10,10+bl,10],[W-10-bl,10,W-10,10,W-10,10+bl],[10,H-10-bl,10,H-10,10+bl,H-10],[W-10-bl,H-10,W-10,H-10,W-10,H-10-bl]].forEach(([x1,y1,x2,y2,x3,y3]) => {
    hudCtx.beginPath(); hudCtx.moveTo(x1,y1); hudCtx.lineTo(x2,y2); hudCtx.lineTo(x3,y3); hudCtx.stroke();
  });
  hudCtx.globalAlpha = 1;
}

// ================================================================
//  INPUT
// ================================================================
canvas3d.addEventListener('mousedown', (e) => {
  if (state.screen !== 'gunner') return;
  if (!c.locked) { canvas3d.requestPointerLock(); return; }
  if (e.button === 0) fireRailgun();
});

document.addEventListener('pointerlockchange', () => {
  c.locked = document.pointerLockElement === canvas3d;
  document.getElementById('lock-prompt').style.display = c.locked ? 'none' : (c.active ? 'flex' : 'none');
});

document.getElementById('lock-prompt').addEventListener('click', () => canvas3d.requestPointerLock());

document.addEventListener('mousemove', (e) => {
  if (!c.locked || !c.active) return;
  c.yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, c.yaw - e.movementX * MOUSE_SENS * (state.settings.sensitivity / 5)));
  c.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, c.pitch + e.movementY * MOUSE_SENS * (state.settings.sensitivity / 5)));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && c.active) { exitGunnerMode(); return; }
  if ((e.key === 'r' || e.key === 'R') && c.active) { c.ammo = c.maxAmmo; }
});

threeReady = true;
} catch(err) {
  console.error('[Old Eden] 3D engine failed to initialise:', err);
  const errBanner = document.createElement('div');
  errBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:10px 16px;background:#cc0000;color:#fff;font:13px monospace;z-index:99999;';
  errBanner.textContent = '3D engine error: ' + err.message + ' â€” game menus still work';
  document.body.appendChild(errBanner);
}

// Nav bar
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    if (target === 'gunner') { showScreen('gunner'); }
    else if (target === 'station') {
      const sys = state.starSystems[state.location.systemIndex];
      if (sys && sys.hasStation) showScreen('station');
      else addComms('Navigation', 'No station available in this system.');
    }
    else if (target === 'settings') showScreen('settings');
    else showScreen(target);
  });
});

// Title buttons
document.getElementById('btn-new').addEventListener('click', () => { initCreateScreen(); showScreen('create'); });
document.getElementById('btn-continue').addEventListener('click', () => {
  if (loadGame()) {
    addComms('AI Director', `Welcome back, pilot ${state.player.name}.`);
    showScreen('bridge');
  }
});

// Settings button (title screen)
document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('title'));

// Create screen
document.getElementById('btn-reroll').addEventListener('click', randomizeGenome);
document.getElementById('btn-create-char').addEventListener('click', createCharacter);
document.getElementById('btn-back-title').addEventListener('click', () => showScreen('title'));

// Station / Character / Rebirth backs
document.getElementById('btn-undock').addEventListener('click', () => { state.location.docked = false; addComms('Station', 'Undocking...'); showScreen('bridge'); });
document.getElementById('btn-char-back').addEventListener('click', () => showScreen('bridge'));
document.getElementById('btn-rebirth-back').addEventListener('click', () => showScreen('bridge'));
document.getElementById('btn-embrace-rebirth').addEventListener('click', () => {
  if (!confirm('Embrace rebirth? Your current character will be reborn into a new body. All credits, inventory, and active quests will be lost.')) return;
  if (state.socket) {
    state.socket.emit('rebirth:perform', { genome: state.player.genome });
  } else {
    // Offline rebirth
    state.player.rebirths++;
    state.player.credits = 500;
    state.player.stellarMarks = 0;
    state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1;
    state.inventory = [];
    state.quests = state.quests.filter(q => !q.active);
    crypto.getRandomValues(new Uint8Array(256)).forEach((v, i) => { if (state.player.genome) state.player.genome[i] = v; });
    addComms('AI Director', 'You have been reborn. A new life awaits.');
    saveGame();
    showScreen('bridge');
  }
});
document.getElementById('btn-jump').addEventListener('click', () => {
  if (state.selectedSystem !== null) jumpToSystem(state.selectedSystem);
});

// Star map clicks
document.getElementById('starmap-canvas').addEventListener('click', onStarMapClick);
document.getElementById('starmap-canvas').addEventListener('dblclick', onStarMapDblClick);

// Market back
document.getElementById('btn-market-back').addEventListener('click', () => showScreen('bridge'));

// ================================================================
//  GLB MODEL LOADER â€” Asset Registry
// ================================================================
const GLB_ASSETS = {
  stargate:       { path: '/3d/glb/cyborg_ship.glb',    role: 'portal',  scale: 0.01 },
  station_a:      { path: '/3d/glb/station_a.glb',      role: 'station', scale: 0.005 },
  station_b:      { path: '/3d/glb/station_b.glb',      role: 'station', scale: 0.005 },
  freighter:      { path: '/3d/glb/freighter.glb',      role: 'npc',     scale: 0.008 },
  iron_sentinel:  { path: '/3d/glb/iron_sentinel.glb',  role: 'npc',     scale: 0.01 },
  evac_pod_a:     { path: '/3d/glb/evac_pod_a.glb',     role: 'npc',     scale: 0.01 },
  evac_pod_b:     { path: '/3d/glb/evac_pod_b.glb',     role: 'npc',     scale: 0.01 },
  railgun_turret: { path: '/3d/glb/railgun_turret.glb', role: 'weapon',  scale: 0.005 },
  railgun_ship:   { path: '/3d/glb/railgun_ship.glb',   role: 'weapon',  scale: 0.008 },
  titan_a:        { path: '/3d/glb/titan_a.glb',        role: 'boss',    scale: 0.006 },
  titan_b:        { path: '/3d/glb/titan_b.glb',        role: 'boss',    scale: 0.006 },
};

const gltfLoader = new GLTFLoader();
// Note: DRACOLoader optional â€” these are standard textured GLBs
const modelLoadQueue = [];
let modelsLoading = 0;
const MAX_CONCURRENT_LOADS = 2;

function loadGLBModel(key) {
  return new Promise((resolve, reject) => {
    if (state.loadedModels[key]) { resolve(state.loadedModels[key]); return; }
    const asset = GLB_ASSETS[key];
    if (!asset) { reject(new Error('Unknown asset: ' + key)); return; }
    gltfLoader.load(asset.path,
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(asset.scale);
        // Optimise â€” reduce draw calls by merging small meshes
        model.traverse(child => {
          if (child.isMesh) {
            child.frustumCulled = true;
            if (child.material) {
              child.material.precision = 'mediump';
            }
          }
        });
        state.loadedModels[key] = model;
        resolve(model);
      },
      undefined,
      (err) => { console.warn('[GLB] Failed to load', key, err); reject(err); }
    );
  });
}

// Progressive loader â€” loads models on demand without blocking
async function preloadCriticalModels() {
  try {
    // Load station models first (most visible)
    await loadGLBModel('station_a');
    addComms('System', 'Station model loaded.');
  } catch(e) { /* model loading is optional â€” game works with procedural fallback */ }
}

// ================================================================
//  STARGATE PORTAL â€” Procedural 3D Stargate
// ================================================================
let stargateGroup = null;
let stargatePortalMat = null;

function createStargate() {
  if (stargateGroup) return;
  stargateGroup = new THREE.Group();
  stargateGroup.name = 'stargate';

  // Outer ring â€” torus
  const ringGeo = new THREE.TorusGeometry(18, 2.5, 16, 48);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.3, metalness: 0.9, emissive: 0x223344, emissiveIntensity: 0.2 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  stargateGroup.add(ring);

  // Inner chevrons â€” 8 glowing markers around the ring
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
    const chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    const chev = new THREE.Mesh(chevGeo, chevMat);
    chev.position.set(Math.cos(angle) * 18, Math.sin(angle) * 18, 0);
    chev.lookAt(0, 0, 0);
    stargateGroup.add(chev);
  }

  // Portal surface â€” shimmering circle
  stargatePortalMat = new THREE.MeshBasicMaterial({
    color: 0x2244cc, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
  });
  const portalGeo = new THREE.CircleGeometry(16, 48);
  const portal = new THREE.Mesh(portalGeo, stargatePortalMat);
  stargateGroup.add(portal);

  // Energy particles around ring
  const particleGeo = new THREE.BufferGeometry();
  const pCount = 200;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 16 + (Math.random() - 0.5) * 6;
    pPos[i*3] = Math.cos(a) * r;
    pPos[i*3+1] = Math.sin(a) * r;
    pPos[i*3+2] = (Math.random() - 0.5) * 4;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x44aaff, size: 0.5, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  stargateGroup.add(new THREE.Points(particleGeo, particleMat));

  // Position the stargate in current system
  stargateGroup.position.set(80, 20, -150);
  stargateGroup.rotation.y = Math.PI * 0.3;
  scene.add(stargateGroup);
}

function animateStargate(time) {
  if (!stargateGroup) return;
  stargateGroup.rotation.z = time * 0.0001;
  if (stargatePortalMat) {
    stargatePortalMat.opacity = 0.25 + Math.sin(time * 0.003) * 0.12;
    const hue = (time * 0.0002) % 1;
    stargatePortalMat.color.setHSL(0.6 + hue * 0.1, 0.8, 0.4);
  }
}

// ================================================================
//  ALT UNIVERSE â€” Procedural Generation
// ================================================================
function generateAltUniverse() {
  const altSystems = [];
  const altArtifacts = ['Void Crystal', 'Temporal Shard', 'Quantum Echo', 'Dark Matter Core', 'Stellar Fragment'];
  const prefixes = ['Rift', 'Void', 'Shadow', 'Phantom', 'Echo', 'Astral', 'Cosmic', 'Null'];
  const suffixes = ['Nebula', 'Rift', 'Abyss', 'Vortex', 'Anomaly', 'Expanse', 'Breach', 'Chasm'];

  const numSystems = 15 + Math.floor(Math.random() * 20);
  for (let i = 0; i < numSystems; i++) {
    const angle = i * 2.399 + Math.random() * 0.5;
    const radius = 40 + Math.sqrt(i) * 45;
    altSystems.push({
      id: 'alt-' + i,
      name: prefixes[Math.floor(Math.random()*prefixes.length)] + ' ' + suffixes[Math.floor(Math.random()*suffixes.length)],
      x: Math.cos(angle) * radius + (Math.random()-0.5)*30,
      y: Math.sin(angle) * radius + (Math.random()-0.5)*30,
      starType: ['Red Giant', 'Pulsar', 'White Dwarf', 'Black Hole Remnant', 'Magnetar'][i % 5],
      controllingFaction: 'void_collective',
      factionColor: '#aa22ff',
      resources: [altArtifacts[i % altArtifacts.length]],
      hazards: Math.random() > 0.5 ? ['Dimensional Instability'] : [],
      planetCount: Math.floor(Math.random() * 5),
      hasStation: i % 4 === 0,
      hasArtifact: i % 3 === 0,
      connections: [],
    });
  }
  // Build connections
  altSystems.forEach((s, i) => {
    altSystems.forEach((t, j) => {
      if (i !== j && Math.hypot(s.x - t.x, s.y - t.y) < 100) s.connections.push(j);
    });
  });
  return { systems: altSystems, artifactsCollected: 0, artifactsNeeded: 3 };
}

function enterAltUniverse() {
  state.altUniverse = generateAltUniverse();
  state.inAltUniverse = true;
  // Save original systems
  state._origSystems = state.starSystems;
  state._origSystemIndex = state.location.systemIndex;
  state.starSystems = state.altUniverse.systems;
  state.location.systemIndex = 0;
  addComms('Stargate', '\u26a0 DIMENSIONAL BREACH â€” You have entered an alternate universe!');
  addComms('Stargate', `Collect ${state.altUniverse.artifactsNeeded} artifacts to unlock the return portal.`);
  AudioSFX.play('jump');
  showScreen('bridge');
}

function exitAltUniverse() {
  if (!state.inAltUniverse || !state.altUniverse) return;
  if (state.altUniverse.artifactsCollected < state.altUniverse.artifactsNeeded) {
    addComms('Stargate', `Cannot return â€” need ${state.altUniverse.artifactsNeeded - state.altUniverse.artifactsCollected} more artifacts.`);
    return;
  }
  state.starSystems = state._origSystems;
  state.location.systemIndex = state._origSystemIndex;
  state.inAltUniverse = false;
  // Award bonus for returning
  const bonus = state.altUniverse.artifactsCollected * 500;
  state.player.credits += bonus;
  addComms('Stargate', `Returned to origin universe! +${bonus} EC artifact bonus.`);
  state.altUniverse = null;
  AudioSFX.play('jump');
  showScreen('bridge');
}

function collectArtifact() {
  if (!state.altUniverse) return;
  const sys = state.starSystems[state.location.systemIndex];
  if (!sys || !sys.hasArtifact) { addComms('System', 'No artifact in this system.'); return; }
  sys.hasArtifact = false;
  state.altUniverse.artifactsCollected++;
  const name = sys.resources[0] || 'Unknown Artifact';
  state.inventory.push({ name, quantity: 1 });
  addComms('Discovery', `Artifact collected: ${name} (${state.altUniverse.artifactsCollected}/${state.altUniverse.artifactsNeeded})`);
  AudioSFX.play('quest_complete');
  if (state.altUniverse.artifactsCollected >= state.altUniverse.artifactsNeeded) {
    addComms('Stargate', '\u2728 RETURN PORTAL ACTIVATED â€” You may now return to the origin universe!');
  }
}

// ================================================================
//  ASTEROID MINING SYSTEM
// ================================================================
let miningLaserBeam = null;

function startMining(asteroidIndex) {
  if (state.mining.active) return;
  const asteroid = c.asteroids[asteroidIndex];
  if (!asteroid) return;
  state.mining.active = true;
  state.mining.target = asteroidIndex;
  state.mining.progress = 0;

  // Create laser beam
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, depthWrite: false });
  const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
  miningLaserBeam = new THREE.Mesh(beamGeo, beamMat);
  scene.add(miningLaserBeam);
  addComms('Mining', 'Mining laser engaged...');
}

function updateMining(dt) {
  if (!state.mining.active) return;
  const asteroid = c.asteroids[state.mining.target];
  if (!asteroid) { stopMining(); return; }

  state.mining.progress += dt * 20; // 5 seconds to mine

  // Update laser beam visual
  if (miningLaserBeam) {
    const from = ship.position.clone();
    const to = asteroid.position.clone();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    miningLaserBeam.position.copy(mid);
    miningLaserBeam.scale.set(1, dist, 1);
    miningLaserBeam.lookAt(to);
    miningLaserBeam.rotateX(Math.PI/2);
    miningLaserBeam.material.opacity = 0.4 + Math.sin(state.gameTime * 0.01) * 0.3;
    miningLaserBeam.material.color.setHSL(0.33 + Math.sin(state.gameTime * 0.005) * 0.05, 1, 0.5);
  }

  if (state.mining.progress >= 100) {
    // Mining complete â€” yield resources
    const ores = ['Titanite Ore', 'Iron Fragments', 'Dark Matter Crystals', 'Rare Earth Compounds', 'Platinum Dust'];
    const ore = ores[Math.floor(Math.random() * ores.length)];
    const qty = 1 + Math.floor(Math.random() * 3);
    const existing = state.inventory.find(i => i.name === ore);
    if (existing) existing.quantity += qty;
    else state.inventory.push({ name: ore, quantity: qty });
    const credits = 20 + Math.floor(Math.random() * 80);
    state.player.credits += credits;
    c.dmgNumbers.push({ text: '+' + ore, pos: asteroid.position.clone(), age: 0, color: '#00ff88' });
    addComms('Mining', `Extracted ${qty}x ${ore} (+${credits} EC)`);
    AudioSFX.play('quest_complete');
    // Remove asteroid
    scene.remove(asteroid);
    c.asteroids.splice(state.mining.target, 1);
    stopMining();
  }
}

function stopMining() {
  state.mining.active = false;
  state.mining.target = null;
  state.mining.progress = 0;
  if (miningLaserBeam) { scene.remove(miningLaserBeam); miningLaserBeam = null; }
}

// ================================================================
//  NPC SHIPS â€” Friendly & Enemy with behaviours
// ================================================================
const NPC_TYPES = [
  { type: 'trader',    color: 0x22cc66, speed: 8,  hp: 5,  friendly: true,  name: 'Trader' },
  { type: 'patrol',    color: 0x4488ff, speed: 12, hp: 8,  friendly: true,  name: 'Patrol' },
  { type: 'freighter', color: 0x88aa44, speed: 5,  hp: 15, friendly: true,  name: 'Freighter' },
  { type: 'pirate',    color: 0xff4444, speed: 15, hp: 6,  friendly: false, name: 'Pirate' },
  { type: 'raider',    color: 0xff8800, speed: 18, hp: 4,  friendly: false, name: 'Raider' },
  { type: 'smuggler',  color: 0xcc44cc, speed: 20, hp: 3,  friendly: false, name: 'Smuggler' },
];

function spawnNPCShip(type) {
  const npcDef = NPC_TYPES.find(n => n.type === type) || NPC_TYPES[0];
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: npcDef.color, roughness: 0.5, metalness: 0.6, emissive: npcDef.color, emissiveIntensity: 0.15 });
  // Simple ship body
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 3), mat));
  const wGeo = new THREE.BoxGeometry(4, 0.1, 1.2);
  { const wL = new THREE.Mesh(wGeo, mat); wL.position.set(-2.2, 0, 0); g.add(wL); }
  { const wR = new THREE.Mesh(wGeo, mat); wR.position.set(2.2, 0, 0); g.add(wR); }
  // Engine glow
  const eMat = new THREE.MeshBasicMaterial({ color: npcDef.friendly ? 0x44aaff : 0xff4422, transparent: true, opacity: 0.7 });
  { const eM = new THREE.Mesh(new THREE.CircleGeometry(0.25, 8), eMat); eM.position.set(0, 0, 1.6); g.add(eM); }
  // Name label (stored in userData)
  const factionNames = ['Dominion', 'Colonies', 'Syndicate', 'Covenant', 'Collective', 'Iron Pact'];
  const names = ['Artemis', 'Vanguard', 'Horizon', 'Eclipse', 'Stellaris', 'Nomad', 'Wraith', 'Tempest', 'Aurora', 'Zenith'];
  const npcName = names[Math.floor(Math.random() * names.length)] + '-' + Math.floor(Math.random() * 999);

  const theta = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * 200;
  g.position.set(
    ship.position.x + Math.cos(theta) * dist,
    (Math.random() - 0.5) * 40,
    ship.position.z + Math.sin(theta) * dist
  );
  g.lookAt(ship.position);
  scene.add(g);

  // Waypoint path for this NPC
  const waypoints = [];
  for (let w = 0; w < 4; w++) {
    waypoints.push(new THREE.Vector3(
      g.position.x + (Math.random()-0.5) * 300,
      (Math.random()-0.5) * 50,
      g.position.z + (Math.random()-0.5) * 300
    ));
  }

  state.npcShips.push({
    group: g, type: npcDef.type, name: npcName, hp: npcDef.hp, maxHp: npcDef.hp,
    speed: npcDef.speed, friendly: npcDef.friendly,
    waypoints, waypointIdx: 0, lastShot: 0,
  });
}

function spawnSystemNPCs() {
  // Clear existing
  state.npcShips.forEach(n => scene.remove(n.group));
  state.npcShips = [];
  // Spawn 4-8 NPCs per system
  const count = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const types = Math.random() > 0.4
      ? ['trader', 'patrol', 'freighter'][Math.floor(Math.random()*3)]
      : ['pirate', 'raider', 'smuggler'][Math.floor(Math.random()*3)];
    spawnNPCShip(types);
  }
}

function updateNPCShips(dt) {
  state.npcShips.forEach(npc => {
    // Follow waypoints
    const target = npc.waypoints[npc.waypointIdx];
    if (!target) return;
    const dir = target.clone().sub(npc.group.position);
    const dist = dir.length();
    if (dist < 10) {
      npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
    } else {
      dir.normalize();
      npc.group.position.addScaledVector(dir, npc.speed * dt);
      npc.group.lookAt(target);
    }
    // Hostile NPCs shoot at player if close
    if (!npc.friendly && npc.group.position.distanceTo(ship.position) < 120) {
      if (state.gameTime - npc.lastShot > 4000) {
        npc.lastShot = state.gameTime;
        const boltDir = ship.position.clone().sub(npc.group.position).normalize();
        boltDir.x += (Math.random()-0.5)*0.2; boltDir.y += (Math.random()-0.5)*0.2; boltDir.normalize();
        const boltMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), boltMat);
        bolt.position.copy(npc.group.position);
        bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), boltDir);
        const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,1.5,4), new THREE.MeshBasicMaterial({color:0xff6644,transparent:true,opacity:0.5}));
        trail.position.copy(bolt.position); trail.quaternion.copy(bolt.quaternion);
        const bGroup = new THREE.Group(); bGroup.add(bolt); bGroup.add(trail); scene.add(bGroup);
        c.enemyBolts.push({ group: bGroup, dir: boltDir, speed: 100, age: 0, life: 5000, mat: boltMat, trailMat: trail.material });
      }
    }
  });
}

// ================================================================
//  NPC STATIONS â€” Procedural 3D
// ================================================================
let stationModels = [];

function spawnStationModel() {
  // Remove old station models
  stationModels.forEach(m => scene.remove(m));
  stationModels = [];
  const sys = state.starSystems[state.location.systemIndex];
  if (!sys || !sys.hasStation) return;
  const g = new THREE.Group();
  // Central hub
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.4, metalness: 0.7 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 12), hubMat));
  // Ring
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.8, emissive: 0x223344, emissiveIntensity: 0.1 });
  const torusM = new THREE.Mesh(new THREE.TorusGeometry(12, 1.5, 8, 24), ringMat);
  torusM.rotation.x = Math.PI/2;
  g.add(torusM);
  // Solar panels
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 0.1), new THREE.MeshStandardMaterial({color:0x2244aa,roughness:0.2,metalness:0.5}));
    panel.position.set(Math.cos(angle)*18, Math.sin(angle)*3, Math.sin(angle)*18);
    panel.lookAt(0,0,0);
    g.add(panel);
  }
  // Dock lights
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.8}));
    light.position.set(Math.cos(angle)*12, 0, Math.sin(angle)*12);
    g.add(light);
  }
  g.position.set(-60, 10, -80);
  scene.add(g);
  stationModels.push(g);
}

// ================================================================
//  EVE-STYLE GALACTIC MARKET with NPC Traders
// ================================================================
const MARKET_ITEMS = [
  { name: 'Titanite Ore',          category: 'ore',      basePrice: 120 },
  { name: 'Iron Fragments',        category: 'ore',      basePrice: 80 },
  { name: 'Dark Matter Crystals',  category: 'rare',     basePrice: 850 },
  { name: 'Platinum Dust',         category: 'ore',      basePrice: 200 },
  { name: 'Rare Earth Compounds',  category: 'material', basePrice: 180 },
  { name: 'Hydrogen Fuel',         category: 'fuel',     basePrice: 45 },
  { name: 'Quantum Processors',    category: 'tech',     basePrice: 1200 },
  { name: 'Anti-matter Reserves',  category: 'fuel',     basePrice: 2000 },
  { name: 'Bio-organic Materials', category: 'material', basePrice: 200 },
  { name: 'Ship Hull Plates',      category: 'material', basePrice: 300 },
  { name: 'Shield Emitters',       category: 'tech',     basePrice: 550 },
  { name: 'Void Crystal',          category: 'artifact', basePrice: 3000 },
  { name: 'Temporal Shard',        category: 'artifact', basePrice: 4500 },
];

function generateNPCMarketOrders() {
  state.market.orders = [];
  const npcTraders = ['Stellaris Corp', 'Free Colonies Trading', 'Iron Pact Smelters', 'Syndicate Brokers', 'Void Collective Labs', 'NPC-' + Math.floor(Math.random()*999)];
  MARKET_ITEMS.forEach(item => {
    // NPC sell orders (player can buy from these)
    const sellCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sellCount; i++) {
      const priceVar = 0.8 + Math.random() * 0.4; // Â±20%
      state.market.orders.push({
        id: 'npc-s-' + item.name + '-' + i,
        item: item.name,
        type: 'sell',
        price: Math.floor(item.basePrice * priceVar),
        quantity: 1 + Math.floor(Math.random() * 10),
        trader: npcTraders[Math.floor(Math.random() * npcTraders.length)],
        isNPC: true,
      });
    }
    // NPC buy orders (player can sell to these)
    const buyCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < buyCount; i++) {
      const priceVar = 0.6 + Math.random() * 0.35; // lower than sell
      state.market.orders.push({
        id: 'npc-b-' + item.name + '-' + i,
        item: item.name,
        type: 'buy',
        price: Math.floor(item.basePrice * priceVar),
        quantity: 1 + Math.floor(Math.random() * 20),
        trader: npcTraders[Math.floor(Math.random() * npcTraders.length)],
        isNPC: true,
      });
    }
  });
  // Sort by price
  state.market.orders.sort((a, b) => a.item.localeCompare(b.item) || a.price - b.price);
}

let marketTab = 'buy';
window._marketTab = (tab) => {
  marketTab = tab;
  renderMarketScreen();
};

function renderMarketScreen() {
  const el = document.getElementById('market-content');
  // Tab highlights
  ['buy','sell','history','place'].forEach(t => {
    const btn = document.getElementById('market-tab-' + t);
    if (btn) { btn.style.borderColor = t === marketTab ? 'var(--gold)' : ''; btn.style.color = t === marketTab ? 'var(--gold)' : ''; }
  });
  if (marketTab === 'buy') {
    const sells = state.market.orders.filter(o => o.type === 'sell');
    el.innerHTML = `<table class="market-table"><thead><tr><th>Item</th><th>Price (EC)</th><th>Qty</th><th>Seller</th><th></th></tr></thead><tbody>` +
      sells.map(o => `<tr><td>${o.item}</td><td class="market-buy">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style="color:var(--muted)">${o.trader}</td>
        <td><button class="trade-buy" onclick="window._marketBuy('${o.id}')">Buy</button></td></tr>`).join('') +
      `</tbody></table>`;
  } else if (marketTab === 'sell') {
    const buys = state.market.orders.filter(o => o.type === 'buy');
    el.innerHTML = `<table class="market-table"><thead><tr><th>Item</th><th>Price (EC)</th><th>Qty Wanted</th><th>Buyer</th><th></th></tr></thead><tbody>` +
      buys.map(o => `<tr><td>${o.item}</td><td class="market-sell">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style="color:var(--muted)">${o.trader}</td>
        <td><button class="trade-sell" onclick="window._marketSell('${o.id}')">Sell</button></td></tr>`).join('') +
      `</tbody></table>`;
  } else if (marketTab === 'history') {
    el.innerHTML = state.market.history.length
      ? `<table class="market-table"><thead><tr><th>Time</th><th>Item</th><th>Type</th><th>Price</th><th>Qty</th></tr></thead><tbody>` +
        state.market.history.slice(-20).reverse().map(h => `<tr><td style="color:var(--muted)">${formatTimeAgo(h.time)}</td><td>${h.item}</td><td style="color:${h.type==='buy'?'var(--green)':'var(--danger)'}">${h.type}</td><td>${h.price}</td><td>${h.quantity}</td></tr>`).join('') +
        `</tbody></table>`
      : '<p style="color:var(--muted)">No trade history yet.</p>';
  } else if (marketTab === 'place') {
    el.innerHTML = `<div style="max-width:400px;">
      <div class="panel-title">Place Market Order</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:0.8rem;color:var(--muted);">Item</label>
        <select id="order-item" class="order-input" style="width:100%;">${MARKET_ITEMS.map(i => `<option value="${i.name}">${i.name}</option>`).join('')}</select>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:8px;">
        <div><label style="font-size:0.8rem;color:var(--muted);">Type</label><br/>
          <select id="order-type" class="order-input"><option value="sell">Sell</option><option value="buy">Buy</option></select></div>
        <div><label style="font-size:0.8rem;color:var(--muted);">Price (EC)</label><br/>
          <input id="order-price" class="order-input" type="number" min="1" value="100"/></div>
        <div><label style="font-size:0.8rem;color:var(--muted);">Qty</label><br/>
          <input id="order-qty" class="order-input" type="number" min="1" value="1"/></div>
      </div>
      <button class="btn btn-sm" onclick="window._placeOrder()">Place Order</button>
    </div>`;
  }
}

window._marketBuy = (orderId) => {
  const order = state.market.orders.find(o => o.id === orderId);
  if (!order) return;
  if (state.player.credits < order.price) { addComms('Market', 'Insufficient credits.'); return; }
  state.player.credits -= order.price;
  const existing = state.inventory.find(i => i.name === order.item);
  if (existing) existing.quantity++;
  else state.inventory.push({ name: order.item, quantity: 1 });
  order.quantity--;
  state.market.history.push({ item: order.item, type: 'buy', price: order.price, quantity: 1, time: Date.now() });
  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);
  addComms('Market', `Purchased ${order.item} for ${order.price} EC`);
  renderMarketScreen();
};

window._marketSell = (orderId) => {
  const order = state.market.orders.find(o => o.id === orderId);
  if (!order) return;
  const invIdx = state.inventory.findIndex(i => i.name === order.item && (i.quantity || 1) > 0);
  if (invIdx < 0) { addComms('Market', `You don't have ${order.item} to sell.`); return; }
  state.inventory[invIdx].quantity = (state.inventory[invIdx].quantity || 1) - 1;
  if (state.inventory[invIdx].quantity <= 0) state.inventory.splice(invIdx, 1);
  state.player.credits += order.price;
  order.quantity--;
  state.market.history.push({ item: order.item, type: 'sell', price: order.price, quantity: 1, time: Date.now() });
  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);
  addComms('Market', `Sold ${order.item} for ${order.price} EC`);
  renderMarketScreen();
};

window._placeOrder = () => {
  const item = document.getElementById('order-item')?.value;
  const type = document.getElementById('order-type')?.value;
  const price = parseInt(document.getElementById('order-price')?.value);
  const qty = parseInt(document.getElementById('order-qty')?.value);
  if (!item || !type || !price || !qty || price < 1 || qty < 1) return;
  if (type === 'buy' && state.player.credits < price * qty) { addComms('Market', 'Insufficient credits for buy order.'); return; }
  if (type === 'sell') {
    const inv = state.inventory.find(i => i.name === item);
    if (!inv || (inv.quantity || 1) < qty) { addComms('Market', `Insufficient ${item} in cargo.`); return; }
  }
  state.market.orders.push({ id: 'player-' + Date.now(), item, type, price, quantity: qty, trader: state.player.name || 'You', isNPC: false });
  addComms('Market', `Order placed: ${type} ${qty}x ${item} @ ${price} EC`);
  renderMarketScreen();
};

// ================================================================
//  AI CHATBOT â€” EDEN AI (cockpit assistant)
// ================================================================
const EDEN_AI_RESPONSES = {
  'help':       'Commands: target, mine, status, market, jump, navigate, artifacts, dock. Toggle Auto-Target or Auto-Mine with the buttons below.',
  'status':     () => `Hull: ${Math.floor(state.ship.hull)}/${state.ship.maxHull} | Shield: ${Math.floor(state.ship.shield)}/${state.ship.maxShield} | Credits: ${state.player.credits} EC | Kills: ${c.kills}`,
  'target':     () => { if (c.enemies.length === 0) return 'No hostiles detected.'; const nearest = c.enemies.reduce((a,b) => a.group.position.distanceTo(ship.position) < b.group.position.distanceTo(ship.position) ? a : b); return `Nearest hostile: ${nearest.type} at ${Math.floor(nearest.group.position.distanceTo(ship.position))}m â€” ${nearest.hp}/${nearest.maxHp} HP`; },
  'mine':       () => { if (c.asteroids.length === 0) return 'No asteroids nearby.'; startMining(0); return 'Mining laser engaged on nearest asteroid.'; },
  'market':     () => `Market has ${state.market.orders.length} active orders. Use the Market screen (nav bar) for trading.`,
  'jump':       () => `Current system: ${state.starSystems[state.location.systemIndex]?.name || 'Unknown'}. Use Star Map for navigation.`,
  'artifacts':  () => state.inAltUniverse ? `Alt universe: ${state.altUniverse.artifactsCollected}/${state.altUniverse.artifactsNeeded} artifacts collected.` : 'Not in alt universe. Find a Stargate to enter.',
  'dock':       () => { const sys = state.starSystems[state.location.systemIndex]; return sys?.hasStation ? 'Station available. Use nav bar to dock.' : 'No station in this system.'; },
  'navigate':   () => { const sys = state.starSystems[state.location.systemIndex]; return `System: ${sys?.name}. ${sys?.connections?.length || 0} jump routes available. ${sys?.resources?.join(', ') || 'No resources detected.'}`; },
};

function chatbotRespond(input) {
  const lower = input.toLowerCase().trim();
  // Check keywords
  for (const [key, resp] of Object.entries(EDEN_AI_RESPONSES)) {
    if (lower.includes(key)) {
      return typeof resp === 'function' ? resp() : resp;
    }
  }
  // Generic fallback with context
  if (lower.includes('enemy') || lower.includes('hostile')) return `${c.enemies.length} hostiles in range. ${state.npcShips.filter(n=>!n.friendly).length} hostile NPCs in system.`;
  if (lower.includes('fuel')) return `Fuel: ${state.ship.fuel}/${state.ship.maxFuel}. Jump costs 5 fuel.`;
  if (lower.includes('skin')) return 'Use the Skin panel (gun icon in cockpit) to randomise or manually set ship skin.';
  if (lower.includes('quest') || lower.includes('mission')) return `Active quests: ${state.quests.filter(q=>q.active).length}. Check bridge or station mission board.`;
  if (lower.includes('upgrade')) return `Upgrades: Railgun ${state.upgrades.railgunDmg}x, Shield Regen ${state.upgrades.shieldRegen}/s, Ammo ${state.upgrades.maxAmmo}`;
  return 'I\'m EDEN AI, your cockpit assistant. Try: help, target, mine, status, market, jump, dock, artifacts, navigate.';
}

function addChatMessage(msg, isAI) {
  state.chatbot.messages.push({ text: msg, ai: isAI, time: Date.now() });
  if (state.chatbot.messages.length > 50) state.chatbot.messages.shift();
  renderChatbot();
}

function renderChatbot() {
  const el = document.getElementById('chatbot-messages');
  if (!el) return;
  el.innerHTML = state.chatbot.messages.slice(-15).map(m =>
    `<div class="chat-msg ${m.ai ? 'ai' : 'user'}">${m.text}</div>`
  ).join('');
  el.scrollTop = el.scrollHeight;
}

window._chatSend = () => {
  const input = document.getElementById('chatbot-input');
  if (!input || !input.value.trim()) return;
  const msg = input.value.trim();
  input.value = '';
  addChatMessage(msg, false);
  setTimeout(() => addChatMessage(chatbotRespond(msg), true), 300);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement === document.getElementById('chatbot-input')) {
    window._chatSend();
  }
});

window._toggleAutoTarget = () => {
  state.chatbot.autoTarget = !state.chatbot.autoTarget;
  document.getElementById('btn-auto-target').classList.toggle('on', state.chatbot.autoTarget);
  addChatMessage(state.chatbot.autoTarget ? 'Auto-targeting enabled. I\'ll track the nearest hostile.' : 'Auto-targeting disabled.', true);
};

window._toggleAutoMine = () => {
  state.chatbot.autoMine = !state.chatbot.autoMine;
  document.getElementById('btn-auto-mine').classList.toggle('on', state.chatbot.autoMine);
  addChatMessage(state.chatbot.autoMine ? 'Auto-mining enabled. Will mine nearest asteroid when no hostiles.' : 'Auto-mining disabled.', true);
};

function updateAutoSystems(dt) {
  // Auto-target: track nearest enemy
  if (state.chatbot.autoTarget && c.active && c.enemies.length > 0) {
    const nearest = c.enemies.reduce((a, b) => a.group.position.distanceTo(ship.position) < b.group.position.distanceTo(ship.position) ? a : b);
    const targetDir = nearest.group.position.clone().sub(camera.position);
    const localDir = targetDir.applyQuaternion(camera.quaternion.clone().invert());
    const targetYaw = -Math.atan2(localDir.x, -localDir.z);
    const targetPitch = Math.atan2(localDir.y, Math.sqrt(localDir.x**2 + localDir.z**2));
    // Smooth tracking
    c.yaw += (targetYaw - 0) * dt * 2;
    c.pitch += (targetPitch - 0) * dt * 2;
    c.yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, c.yaw));
    c.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, c.pitch));
  }
  // Auto-mine: mine nearest asteroid when no enemies in range
  if (state.chatbot.autoMine && c.active && !state.mining.active && c.enemies.length === 0 && c.asteroids.length > 0) {
    startMining(0);
  }
}

// ================================================================
//  SHIP SKINS â€” Procedural Metallic & Grunge
// ================================================================
const SKIN_PRESETS = [
  { name: 'Stealth',     primary: 0x111118, accent: 0x44aaff, roughness: 0.8, metalness: 0.9, emissive: 0x001122 },
  { name: 'Chrome',      primary: 0xaaaaaa, accent: 0xffffff, roughness: 0.1, metalness: 1.0, emissive: 0x222222 },
  { name: 'Gold Rush',   primary: 0x886622, accent: 0xffdd44, roughness: 0.3, metalness: 0.9, emissive: 0x332200 },
  { name: 'Blood Storm', primary: 0x441111, accent: 0xff2200, roughness: 0.5, metalness: 0.7, emissive: 0x220000 },
  { name: 'Void Purple', primary: 0x221133, accent: 0xaa44ff, roughness: 0.4, metalness: 0.8, emissive: 0x110022 },
  { name: 'Arctic',      primary: 0x88aacc, accent: 0xccddff, roughness: 0.2, metalness: 0.6, emissive: 0x112233 },
  { name: 'Rust',        primary: 0x663322, accent: 0xff6600, roughness: 0.9, metalness: 0.4, emissive: 0x221100 },
  { name: 'Neon Grime',  primary: 0x222222, accent: 0x00ff88, roughness: 0.7, metalness: 0.5, emissive: 0x003311 },
  { name: 'Solar Flare', primary: 0xaa4400, accent: 0xffaa00, roughness: 0.4, metalness: 0.8, emissive: 0x441100 },
  { name: 'Abyssal',     primary: 0x0a0a1a, accent: 0x2244cc, roughness: 0.6, metalness: 0.9, emissive: 0x000511 },
];

function applySkin(skin) {
  state.currentSkin = skin;
  ship.traverse(child => {
    if (!child.isMesh || !child.material || child.material.isMeshBasicMaterial) return;
    // Determine if this is hull or accent based on original color
    const isAccent = child.material.emissiveIntensity > 0.2;
    child.material.color.setHex(isAccent ? skin.accent : skin.primary);
    child.material.roughness = skin.roughness;
    child.material.metalness = skin.metalness;
    if (child.material.emissive) child.material.emissive.setHex(skin.emissive);
  });
  // Update skin preview canvas
  renderSkinPreview(skin);
}

function generateRandomSkin() {
  const hue1 = Math.random();
  const hue2 = (hue1 + 0.3 + Math.random() * 0.4) % 1;
  const sat1 = 0.3 + Math.random() * 0.5;
  const sat2 = 0.5 + Math.random() * 0.5;
  const lum1 = 0.1 + Math.random() * 0.3;
  const lum2 = 0.3 + Math.random() * 0.5;
  const primary = new THREE.Color().setHSL(hue1, sat1, lum1);
  const accent = new THREE.Color().setHSL(hue2, sat2, lum2);
  const emissive = new THREE.Color().setHSL(hue1, sat1 * 0.5, lum1 * 0.3);
  return {
    name: 'Random #' + Math.floor(Math.random()*999),
    primary: primary.getHex(),
    accent: accent.getHex(),
    emissive: emissive.getHex(),
    roughness: 0.2 + Math.random() * 0.7,
    metalness: 0.3 + Math.random() * 0.7,
  };
}

function renderSkinPreview(skin) {
  const canvas = document.getElementById('skin-preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = 260; canvas.height = 80;
  // Gradient background showing primary â†’ accent
  const grad = ctx.createLinearGradient(0, 0, 260, 0);
  grad.addColorStop(0, '#' + skin.primary.toString(16).padStart(6, '0'));
  grad.addColorStop(0.6, '#' + skin.primary.toString(16).padStart(6, '0'));
  grad.addColorStop(1, '#' + skin.accent.toString(16).padStart(6, '0'));
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 260, 80);
  // Grunge noise overlay
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()*0.06})`;
    ctx.fillRect(Math.random()*260, Math.random()*80, 2+Math.random()*4, 1+Math.random()*3);
  }
  // Label
  ctx.font = 'bold 12px "Segoe UI"'; ctx.fillStyle = '#fff';
  ctx.fillText(skin.name, 10, 20);
  ctx.font = '10px "Segoe UI"'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`R:${skin.roughness.toFixed(1)} M:${skin.metalness.toFixed(1)}`, 10, 36);
}

window._randomSkin = () => {
  const skin = generateRandomSkin();
  applySkin(skin);
  addComms('Cosmetics', `Applied random skin: ${skin.name}`);
};

window._applySkinManual = () => {
  const primary = document.getElementById('skin-primary')?.value || '#334455';
  const accent = document.getElementById('skin-accent')?.value || '#44aaff';
  const skin = {
    name: 'Custom',
    primary: parseInt(primary.replace('#', ''), 16),
    accent: parseInt(accent.replace('#', ''), 16),
    emissive: parseInt(primary.replace('#', ''), 16) & 0x333333,
    roughness: 0.5,
    metalness: 0.7,
  };
  applySkin(skin);
  addComms('Cosmetics', 'Custom skin applied.');
};

function initSkinSwatches() {
  const el = document.getElementById('skin-swatches');
  if (!el) return;
  el.innerHTML = SKIN_PRESETS.map((s, i) =>
    `<div class="skin-swatch" style="background:#${s.primary.toString(16).padStart(6,'0')};border:2px solid #${s.accent.toString(16).padStart(6,'0')}" title="${s.name}" onclick="window._applySkinPreset(${i})"></div>`
  ).join('');
}

window._applySkinPreset = (idx) => {
  const skin = SKIN_PRESETS[idx];
  if (!skin) return;
  applySkin(skin);
  addComms('Cosmetics', `Applied skin: ${skin.name}`);
};

// ================================================================
//  RAILGUN 3D MODEL â€” Enhanced procedural + GLB fallback
// ================================================================
let railgunModel = null;

function createRailgun3DModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.3, metalness: 0.8 });
  const glowMat3 = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.5 });
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.4, metalness: 0.9 });

  // Main barrel housing
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5, 8), bodyMat));
  // Twin rails
  const railGeo = new THREE.BoxGeometry(0.04, 0.04, 5.5);
  { const r1 = new THREE.Mesh(railGeo, glowMat3); r1.position.set(-0.08, 0.12, 0); g.add(r1); }
  { const r2 = new THREE.Mesh(railGeo, glowMat3); r2.position.set(0.08, 0.12, 0); g.add(r2); }
  // Electromagnetic coils (5 rings along barrel)
  for (let i = 0; i < 5; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 12), coilMat);
    coil.position.y = -2 + i * 1;
    coil.rotation.x = Math.PI / 2;
    g.add(coil);
  }
  // Muzzle brake
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.5, 8), bodyMat).translateY(-2.8));
  // Energy capacitor (rear box)
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), bodyMat).translateY(2.5));
  // Scope
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), bodyMat).translateY(0).translateX(0).translateZ(0.15));
  // Mount it
  g.rotation.x = Math.PI / 2;
  g.position.set(0, -0.3, -2);
  g.scale.setScalar(0.4);
  railgunModel = g;
  cockpit.add(g);
}

// ================================================================
//  ADDITIONAL KEYBINDS
// ================================================================
document.addEventListener('keydown', (e) => {
  if (!c.active) return;
  // M = mining toggle
  if (e.key === 'm' || e.key === 'M') {
    if (state.mining.active) stopMining();
    else if (c.asteroids.length > 0) startMining(0);
  }
  // T = chatbot toggle
  if (e.key === 't' || e.key === 'T') {
    if (document.activeElement !== document.getElementById('chatbot-input')) {
      const panel = document.getElementById('chatbot-panel');
      panel.classList.toggle('open');
      state.chatbot.visible = panel.classList.contains('open');
    }
  }
  // K = skin panel toggle
  if (e.key === 'k' || e.key === 'K') {
    document.getElementById('skin-panel').classList.toggle('open');
  }
  // G = enter stargate
  if (e.key === 'g' || e.key === 'G') {
    if (stargateGroup && ship.position.distanceTo(stargateGroup.position) < 40) {
      if (state.inAltUniverse) exitAltUniverse();
      else enterAltUniverse();
    } else {
      addComms('System', 'No stargate in range. Fly closer to the portal.');
    }
  }
  // C = collect artifact
  if (e.key === 'c' || e.key === 'C') {
    if (state.inAltUniverse) collectArtifact();
  }
});

// ================================================================
//  GAME LOOP
// ================================================================
const clock = new THREE.Clock();

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = clock.getDelta();
  const dtMs = dt * 1000;
  state.gameTime += dtMs;

  // Camera â€” always positioned at turret mount
  const worldPos = new THREE.Vector3();
  turretMount.getWorldPosition(worldPos);
  camera.position.copy(worldPos);

  if (c.active) {
    // Gunner look + screen shake
    const shipQuat = new THREE.Quaternion(); ship.getWorldQuaternion(shipQuat);
    const lookEuler = new THREE.Euler(-c.pitch + c.shakeY * 0.02, -c.yaw + c.shakeX * 0.02, 0, 'YXZ');
    camera.quaternion.copy(shipQuat).multiply(new THREE.Quaternion().setFromEuler(lookEuler));

    // Weapon charge
    if (c.charging) {
      c.chargeLevel = Math.min(1, (performance.now() - c.chargeStart) / CHARGE_TIME);
      railGlowMatL.opacity = c.chargeLevel * 0.8;
      railGlowMatR.opacity = c.chargeLevel * 0.8;
      if (c.chargeLevel >= 1) {
        c.charging = false; c.cooling = true; c.coolEnd = performance.now() + COOLDOWN_TIME;
        c.chargeLevel = 0; railGlowMatL.opacity = 0; railGlowMatR.opacity = 0;
        spawnNail();
      }
    }
    if (c.cooling && performance.now() >= c.coolEnd) { c.cooling = false; c.weaponReady = true; }
    if (muzzleMat.opacity > 0) muzzleMat.opacity = Math.max(0, muzzleMat.opacity - dt * 8);

    // Recoil
    if (Math.abs(c.recoilOffset) > 0.001 || Math.abs(c.recoilVel) > 0.001) {
      c.recoilVel += (-15 * c.recoilOffset - 0.8 * c.recoilVel) * dt;
      c.recoilOffset += c.recoilVel * dt;
      if (Math.abs(c.recoilOffset) < 0.001 && Math.abs(c.recoilVel) < 0.001) { c.recoilOffset = 0; c.recoilVel = 0; }
    }
    railL.position.z = -2.0 + c.recoilOffset;
    railR.position.z = -2.0 + c.recoilOffset;
    c.heat = Math.max(0, c.heat - dt * 0.15);

    // Shield regen (uses upgrade value)
    if (state.ship.shield < state.ship.maxShield) {
      state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + dt * state.upgrades.shieldRegen);
    }
    // Damage flash
    if (c.damageFlash > 0) c.damageFlash = Math.max(0, c.damageFlash - dtMs);

    // Screen shake
    if (state.settings.screenShake && c.damageFlash > 0) {
      const intensity = (c.damageFlash / 200) * 1.5;
      c.shakeX = (Math.random() - 0.5) * intensity;
      c.shakeY = (Math.random() - 0.5) * intensity;
    } else { c.shakeX = 0; c.shakeY = 0; }

    // Kill streak decay
    if (c.streak > 0) {
      c.streakTimer -= dtMs;
      if (c.streakTimer <= 0) { c.streak = 0; c.streakMultiplier = 1; }
    }

    // Rotate asteroids
    c.asteroids.forEach(a => {
      a.rotation.x += a.userData.rotSpeed.x * dt;
      a.rotation.y += a.userData.rotSpeed.y * dt;
      a.rotation.z += a.userData.rotSpeed.z * dt;
    });

    // Spawn enemies
    if (state.gameTime - state.lastEnemySpawn > SPAWN_INTERVAL) {
      state.lastEnemySpawn = state.gameTime;
      const types = ['scout','fighter','bomber','interceptor'];
      const spawnCount = 1 + Math.floor(c.cycle / 3);
      for (let si = 0; si < spawnCount; si++) createEnemy(types[Math.floor(Math.random()*4)]);
      if (c.kills > 0 && c.kills % 15 === 0) { c.cycle++; addComms('AI Director', `Cycle ${c.cycle} â€” hostiles intensifying`); }
      // Boss spawn every 20 kills
      if (c.kills > 0 && c.kills % 20 === 0 && !c.bossActive) {
        c.bossActive = true;
        AudioSFX.play('boss_warn');
        addComms('AI Director', '\u26a0 BOSS DETECTED â€” massive hostile signature!');
        createBossEnemy();
      }
    }

    // Update projectiles
    for (let i = c.projectiles.length - 1; i >= 0; i--) {
      const p = c.projectiles[i];
      p.age += dtMs;
      p.group.position.addScaledVector(p.dir, p.speed * dt);
      p.trailMat.opacity = Math.max(0, 0.6 - p.age/3000);
      let hit = false;
      for (let j = c.enemies.length - 1; j >= 0; j--) {
        const e = c.enemies[j];
        if (p.group.position.distanceTo(e.group.position) < 3 * (e.cfg.scale || 1)) {
          e.hp--;
          e.hitFlash = 150;
          AudioSFX.play('hit');
          if (e.hp <= 0) {
            // Kill streak
            c.streak++; c.streakTimer = 3000;
            c.streakMultiplier = c.streak >= 10 ? 3 : c.streak >= 5 ? 2 : c.streak >= 3 ? 1.5 : 1;
            if (c.streak > c.bestStreak) c.bestStreak = c.streak;
            const pts = Math.floor(e.points * c.streakMultiplier);
            c.score += pts; c.kills++;
            state.player.credits += pts;
            // Floating damage number
            c.dmgNumbers.push({ text: '+' + pts, pos: e.group.position.clone(), age: 0, color: c.streak >= 5 ? '#ffcc00' : '#00ff88' });
            if (e.isBoss) { c.bossActive = false; addComms('AI Director', 'Boss destroyed! +500 points'); }
            // Faction rep: killing enemy gains rep with controlling faction, loses with hostile faction
            const sys = state.starSystems[state.location.systemIndex];
            if (sys && sys.controllingFaction) {
              state.factionRep[sys.controllingFaction] = Math.min(1000, (state.factionRep[sys.controllingFaction] || 0) + 5);
            }
            // Report kill to server for economy credit + quest progress
            if (state.socket) state.socket.emit('combat:kill', { enemyType: e.type, points: e.points });
            AudioSFX.play('explode');
            spawnExplosion(e.group.position.clone(), e.cfg.scale);
            // Loot drop chance
            if (Math.random() < 0.4) {
              const lootType = Math.random() < 0.5 ? 'credits' : Math.random() < 0.5 ? 'ammo' : 'health';
              spawnLootDrop(e.group.position.clone(), lootType);
            }
            scene.remove(e.group); c.enemies.splice(j, 1);
          }
          hit = true; break;
        }
      }
      if (hit || p.age > p.life) { scene.remove(p.group); c.projectiles.splice(i, 1); }
    }

    // Update enemies
    c.enemies.forEach(e => {
      const dir = ship.position.clone().sub(e.group.position).normalize();
      e.group.position.addScaledVector(dir, e.speed * dt);
      e.group.lookAt(ship.position);
      e.hitFlash = Math.max(0, e.hitFlash - dtMs);
      // Enemy firing â€” shoot red bolt at player every 3-6 seconds
      if (!e.lastShot) e.lastShot = state.gameTime;
      const fireInterval = e.isBoss ? 1500 : (3000 + Math.random() * 3000);
      if (state.gameTime - e.lastShot > fireInterval && e.group.position.distanceTo(ship.position) < SPAWN_RADIUS) {
        e.lastShot = state.gameTime;
        const boltDir = ship.position.clone().sub(e.group.position).normalize();
        // Add slight inaccuracy
        boltDir.x += (Math.random() - 0.5) * 0.15;
        boltDir.y += (Math.random() - 0.5) * 0.15;
        boltDir.normalize();
        const boltMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), boltMat);
        bolt.position.copy(e.group.position);
        bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), boltDir);
        const boltTrailMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 });
        const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4), boltTrailMat);
        trail.position.copy(bolt.position); trail.quaternion.copy(bolt.quaternion);
        const boltGroup = new THREE.Group(); boltGroup.add(bolt); boltGroup.add(trail); scene.add(boltGroup);
        c.enemyBolts.push({ group: boltGroup, dir: boltDir, speed: 120, age: 0, life: 4000, mat: boltMat, trailMat: boltTrailMat });
      }
      if (e.group.position.distanceTo(ship.position) < 5) {
        if (state.ship.shield > 0) { state.ship.shield = Math.max(0, state.ship.shield - 0.5); AudioSFX.play('shield_hit'); }
        else state.ship.hull = Math.max(0, state.ship.hull - 0.3);
        c.damageFlash = 200;
        if (state.ship.hull <= 0 && !c.dead) {
          c.dead = true;
          c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };
          addComms('AI Director', 'Your ship has been destroyed. Embrace rebirth...');
          AudioSFX.play('explode');
          spawnExplosion(ship.position.clone(), 3);
          setTimeout(() => { c.dead = false; showScreen('rebirth'); exitGunnerMode(); }, 2500);
        }
      }
    });

    // Update enemy bolts
    for (let i = c.enemyBolts.length - 1; i >= 0; i--) {
      const b = c.enemyBolts[i];
      b.age += dtMs;
      b.group.position.addScaledVector(b.dir, b.speed * dt);
      b.trailMat.opacity = Math.max(0, 0.5 - b.age / b.life);
      // Hit player ship?
      if (b.group.position.distanceTo(ship.position) < 6) {
        const dmg = 3 + Math.random() * 4;
        if (state.ship.shield > 0) { state.ship.shield = Math.max(0, state.ship.shield - dmg); AudioSFX.play('shield_hit'); }
        else state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5);
        c.damageFlash = 300;
        scene.remove(b.group); c.enemyBolts.splice(i, 1);
        if (state.ship.hull <= 0 && !c.dead) {
          c.dead = true;
          c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };
          addComms('AI Director', 'Your ship has been destroyed. Embrace rebirth...');
          AudioSFX.play('explode'); spawnExplosion(ship.position.clone(), 3);
          setTimeout(() => { c.dead = false; showScreen('rebirth'); exitGunnerMode(); }, 2500);
        }
        continue;
      }
      if (b.age > b.life) { scene.remove(b.group); c.enemyBolts.splice(i, 1); }
    }

    // Update explosions
    for (let i = c.explosions.length - 1; i >= 0; i--) {
      const ex = c.explosions[i];
      ex.age += dtMs;
      ex.group.children.forEach(ch => {
        ch.position.addScaledVector(ch.userData.dir, ch.userData.speed * dt);
        if (ch.material) ch.material.opacity = Math.max(0, 1 - ex.age / ex.maxAge);
      });
      if (ex.age > ex.maxAge) { scene.remove(ex.group); c.explosions.splice(i, 1); }
    }

    // Engine exhaust
    if (state.gameTime % 200 < dtMs) spawnExhaust();
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
      const ep = exhaustParticles[i];
      ep.age += dtMs;
      ep.mesh.material.opacity = Math.max(0, 0.6 * (1 - ep.age / ep.maxAge));
      if (ep.age > ep.maxAge) { scene.remove(ep.mesh); ep.mesh.geometry.dispose(); ep.mesh.material.dispose(); exhaustParticles.splice(i, 1); }
    }

    // Loot drops â€” bob, spin, collect on proximity
    for (let i = c.lootDrops.length - 1; i >= 0; i--) {
      const l = c.lootDrops[i];
      l.age += dtMs;
      l.group.rotation.y += dt * 2;
      l.group.position.y += Math.sin(l.age * 0.003) * 0.02;
      // Player collect
      if (l.group.position.distanceTo(ship.position) < 12) {
        if (l.type === 'credits') { state.player.credits += 25; c.dmgNumbers.push({ text: '+25 EC', pos: l.group.position.clone(), age: 0, color: '#ffd700' }); }
        else if (l.type === 'ammo') { c.ammo = Math.min(c.maxAmmo, c.ammo + 6); c.dmgNumbers.push({ text: '+6 AMMO', pos: l.group.position.clone(), age: 0, color: '#44aaff' }); }
        else if (l.type === 'health') { state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 15); c.dmgNumbers.push({ text: '+15 HULL', pos: l.group.position.clone(), age: 0, color: '#44ff44' }); }
        AudioSFX.play('quest_complete');
        scene.remove(l.group); c.lootDrops.splice(i, 1); continue;
      }
      // Despawn after 15s
      if (l.age > 15000) { scene.remove(l.group); c.lootDrops.splice(i, 1); }
    }

    // Space dust drift
    c.spaceDust.forEach(d => d.position.addScaledVector(d.userData.drift, dt));

    // Asteroid collision
    c.asteroids.forEach(a => {
      const dist = a.position.distanceTo(ship.position);
      const radius = a.children[0]?.geometry?.boundingSphere?.radius || 4;
      if (dist < radius + 3) {
        const dmg = 5 + Math.random() * 10;
        if (state.ship.shield > 0) state.ship.shield = Math.max(0, state.ship.shield - dmg);
        else state.ship.hull = Math.max(0, state.ship.hull - dmg * 0.5);
        c.damageFlash = 250;
        AudioSFX.play('shield_hit');
      }
    });

    // Weapon heat glow on barrels
    if (railGlowMatL) { railGlowMatL.opacity = c.heat * 0.6; railGlowMatL.color.setHex(c.heat > 0.5 ? 0xff2200 : 0xff8800); }
    if (railGlowMatR) { railGlowMatR.opacity = c.heat * 0.6; railGlowMatR.color.setHex(c.heat > 0.5 ? 0xff2200 : 0xff8800); }

    // --- New system updates ---
    updateNPCShips(dt);
    updateMining(dt);
    updateAutoSystems(dt);
    if (c.stargate) animateStargate(state.gameTime);

    // Auto-save every 60s
    if (state.gameTime - c.lastAutoSave > 60000) {
      c.lastAutoSave = state.gameTime;
      saveGame();
    }

    renderHUD();
  } else {
    // Bridge â€” gentle idle camera
    const time = state.gameTime * 0.0001;
    const shipQuat2 = new THREE.Quaternion(); ship.getWorldQuaternion(shipQuat2);
    const idleEuler = new THREE.Euler(Math.sin(time * 0.7) * 0.02, Math.sin(time) * 0.03, 0, 'YXZ');
    camera.quaternion.copy(shipQuat2).multiply(new THREE.Quaternion().setFromEuler(idleEuler));
  }

  renderer.render(scene, camera);
}

// ================================================================
//  INITIALIZATION
// ================================================================
async function init() {
  // Generate star systems
  state.starSystems = generateStarSystems();

  // Try to connect Socket.IO
  state.socket = await connectSocket();

  // Try to fetch server star map data
  try {
    const resp = await fetch('/api/game/starmap');
    if (resp.ok) {
      const data = await resp.json();
      if (data.systems && data.systems.length) {
        // Merge server data (positions from client, metadata from server)
        data.systems.forEach((s, i) => {
          if (state.starSystems[i]) {
            state.starSystems[i].name = s.name || state.starSystems[i].name;
            state.starSystems[i].starType = s.starType || state.starSystems[i].starType;
            state.starSystems[i].resources = s.resources || state.starSystems[i].resources;
            state.starSystems[i].hazards = s.hazards || state.starSystems[i].hazards;
            state.starSystems[i].planetCount = s.planetCount || state.starSystems[i].planetCount;
            if (s.controllingFaction) {
              state.starSystems[i].controllingFaction = s.controllingFaction;
              const f = FACTIONS.find(f2 => f2.id === s.controllingFaction || f2.name === s.controllingFaction);
              if (f) state.starSystems[i].factionColor = f.color;
            }
          }
        });
      }
    }
  } catch(e) { /* offline mode â€” using client-generated data */ }

  // Fetch server quests
  try {
    const qResp = await fetch('/api/game/quests');
    if (qResp.ok) {
      const qData = await qResp.json();
      if (qData.quests && qData.quests.length) {
        state.quests = qData.quests.map(q => ({
          title: q.title || q.objective || 'Unknown Mission',
          summary: q.description || q.hook || 'Complete this mission.',
          reward: q.reward || Math.floor(Math.random() * 500 + 100),
          active: false,
        }));
      }
    }
  } catch(e) { /* offline â€” quests generated on demand */ }

  // Check for saved game
  if (localStorage.getItem('oe-save')) {
    document.getElementById('btn-continue').disabled = false;
  }

  // Start
  // Init audio on first user interaction
  document.addEventListener('click', () => AudioSFX.init(), { once: true });
  document.addEventListener('keydown', () => AudioSFX.init(), { once: true });

  addComms('AI Director', 'Old Eden systems initialising...');
  addComms('AI Director', 'The universe awaits, pilot.');
  if (threeReady) gameLoop();
}

init();

